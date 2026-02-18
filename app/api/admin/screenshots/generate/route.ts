import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

export const dynamic = 'force-dynamic';

// Get screenshots directory path
function getScreenshotsDir(): string {
  if (process.env.SCREENSHOTS_DIR) {
    return process.env.SCREENSHOTS_DIR;
  }

  const projectRoot = process.cwd();
  const possiblePaths = [
    path.join(projectRoot, '..', 'PersonalAIApp', 'screenshots'),
    path.join(projectRoot, 'PersonalAIApp', 'screenshots'),
    '/Users/lwang2/Documents/GitHub/ios/personal/PersonalAIApp/screenshots',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return possiblePaths[0];
}

/** Primary canvas size - matches raw screenshot dimensions (iPhone 6.9") */
const PRIMARY = { width: 1320, height: 2868 };

/** Banner occupies top portion; screenshot fills the rest */
const BANNER_HEIGHT = 700;
const SCREENSHOT_AREA_HEIGHT = PRIMARY.height - BANNER_HEIGHT;

/** All required App Store device sizes */
const DEVICE_SIZES = [
  { label: '6.9', width: 1320, height: 2868 },
  { label: '6.7', width: 1290, height: 2796 },
  { label: '6.5', width: 1284, height: 2778 },
  { label: '5.5', width: 1242, height: 2208 },
];

interface ScreenshotConfig {
  inputFile: string;
  outputName: string;
  title: string;
  subtitle: string;
  gradientFrom: string;
  gradientTo: string;
}

/** Escape XML special characters */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build an SVG overlay with gradient background + centered text.
 * The SVG covers the full canvas so it can be composited directly.
 */
function buildBannerSvg(config: ScreenshotConfig): string {
  const { title, subtitle, gradientFrom, gradientTo } = config;
  const w = PRIMARY.width;
  const h = PRIMARY.height;

  // Text positioning - centered in the banner area
  const titleY = BANNER_HEIGHT * 0.42;
  const subtitleY = BANNER_HEIGHT * 0.62;

  // Font sizes
  const titleSize = 72;
  const subtitleSize = 38;

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${gradientFrom}" />
      <stop offset="100%" stop-color="${gradientTo}" />
    </linearGradient>
  </defs>

  <!-- Gradient fills entire canvas (screenshot composited on top of bottom portion) -->
  <rect width="${w}" height="${h}" fill="url(#bg)" />

  <!-- Title -->
  <text
    x="${w / 2}" y="${titleY}"
    text-anchor="middle"
    font-family="SF Pro Display, -apple-system, Helvetica Neue, Arial, sans-serif"
    font-size="${titleSize}"
    font-weight="700"
    fill="white"
    letter-spacing="-0.5"
  >${escapeXml(title)}</text>

  <!-- Subtitle -->
  <text
    x="${w / 2}" y="${subtitleY}"
    text-anchor="middle"
    font-family="SF Pro Text, -apple-system, Helvetica Neue, Arial, sans-serif"
    font-size="${subtitleSize}"
    font-weight="400"
    fill="rgba(255,255,255,0.9)"
  >${escapeXml(subtitle)}</text>
</svg>`;
}

async function generateScreenshot(
  config: ScreenshotConfig,
  inputDir: string,
  outputBase: string
): Promise<{ success: boolean; error?: string }> {
  const inputPath = path.join(inputDir, config.inputFile);

  if (!fs.existsSync(inputPath)) {
    return { success: false, error: `Input not found: ${config.inputFile}` };
  }

  try {
    // 1. Read raw screenshot and get its dimensions
    const rawImage = sharp(inputPath);
    const rawMeta = await rawImage.metadata();
    const rawW = rawMeta.width!;
    const rawH = rawMeta.height!;

    // 2. Scale the screenshot to fit the screenshot area (below the banner)
    const screenshotScale = Math.min(
      PRIMARY.width / rawW,
      SCREENSHOT_AREA_HEIGHT / rawH
    );
    const scaledW = Math.round(rawW * screenshotScale);
    const scaledH = Math.round(rawH * screenshotScale);

    const resizedScreenshot = await sharp(inputPath)
      .resize(scaledW, scaledH, { fit: 'inside' })
      .toBuffer();

    // 3. Build banner SVG (full canvas size)
    const bannerSvg = buildBannerSvg(config);
    const bannerBuffer = Buffer.from(bannerSvg);

    // 4. Composite: banner background + screenshot placed below banner
    const xOffset = Math.round((PRIMARY.width - scaledW) / 2);
    const yOffset = BANNER_HEIGHT;

    const primaryBuffer = await sharp(bannerBuffer)
      .resize(PRIMARY.width, PRIMARY.height)
      .composite([
        {
          input: resizedScreenshot,
          left: xOffset,
          top: yOffset,
        },
      ])
      .png()
      .toBuffer();

    // 5. Output for each device size
    for (const size of DEVICE_SIZES) {
      const outDir = path.join(outputBase, size.label);
      fs.mkdirSync(outDir, { recursive: true });

      const outPath = path.join(outDir, config.outputName);

      if (size.width === PRIMARY.width && size.height === PRIMARY.height) {
        await sharp(primaryBuffer).toFile(outPath);
      } else {
        await sharp(primaryBuffer)
          .resize(size.width, size.height, { fit: 'fill' })
          .png()
          .toFile(outPath);
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Screenshot generation is only available in development mode.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const configs: ScreenshotConfig[] = body.configs;

    if (!configs || !Array.isArray(configs) || configs.length === 0) {
      return NextResponse.json(
        { error: 'No screenshot configurations provided' },
        { status: 400 }
      );
    }

    // Get screenshots directory
    const inputDir = getScreenshotsDir();
    const outputBase = path.join(inputDir, 'appstore');

    console.log('[Screenshots Generate] Using directory:', inputDir);

    // Validate input directory exists
    if (!fs.existsSync(inputDir)) {
      return NextResponse.json(
        { error: `Screenshots directory not found: ${inputDir}` },
        { status: 400 }
      );
    }

    // Save config for future use
    const configPath = path.join(inputDir, 'screenshot-config.json');
    fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));

    // Generate each screenshot
    const results: { file: string; success: boolean; error?: string }[] = [];
    let successCount = 0;

    for (const config of configs) {
      if (!config.inputFile) {
        results.push({
          file: config.outputName,
          success: false,
          error: 'No input file specified',
        });
        continue;
      }

      const result = await generateScreenshot(config, inputDir, outputBase);
      results.push({
        file: config.outputName,
        ...result,
      });

      if (result.success) {
        successCount++;
      }
    }

    const totalGenerated = successCount * DEVICE_SIZES.length;
    const message =
      successCount === configs.length
        ? `Successfully generated ${totalGenerated} screenshots (${successCount} designs x ${DEVICE_SIZES.length} sizes)`
        : `Generated ${successCount}/${configs.length} screenshots. Check errors below.`;

    return NextResponse.json({
      success: successCount > 0,
      generated: totalGenerated,
      message,
      results,
    });
  } catch (error: any) {
    console.error('[Screenshots Generate] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate screenshots' },
      { status: 500 }
    );
  }
}
