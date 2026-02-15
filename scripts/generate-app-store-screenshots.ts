/**
 * Generate App Store screenshots with marketing banners.
 *
 * Takes raw iPhone screenshots and composites them onto a gradient background
 * with title + subtitle text banners. Outputs all required iPhone sizes.
 *
 * Usage:
 *   cd personal-ai-web && npx tsx scripts/generate-app-store-screenshots.ts
 *
 * Input:  PersonalAIApp/screenshots/*.png (1320x2868, iPhone 6.9")
 * Output: PersonalAIApp/screenshots/appstore/{size}/*.png
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const INPUT_DIR = path.resolve(__dirname, '../../PersonalAIApp/screenshots');
const OUTPUT_BASE = path.resolve(__dirname, '../../PersonalAIApp/screenshots/appstore');

/** Primary canvas size — matches raw screenshot dimensions (iPhone 6.9") */
const PRIMARY = { width: 1320, height: 2868 };

/** Banner occupies top portion; screenshot fills the rest */
const BANNER_HEIGHT = 700;
const SCREENSHOT_AREA_HEIGHT = PRIMARY.height - BANNER_HEIGHT; // 2168

/** All required App Store device sizes */
const DEVICE_SIZES: { label: string; width: number; height: number }[] = [
  { label: '6.9', width: 1320, height: 2868 },
  { label: '6.7', width: 1290, height: 2796 },
  { label: '6.5', width: 1284, height: 2778 },
  { label: '5.5', width: 1242, height: 2208 },
];

/** Per-screenshot configuration */
interface ScreenshotConfig {
  inputFile: string;
  outputName: string;
  title: string;
  subtitle: string;
  gradientFrom: string;
  gradientTo: string;
}

const SCREENSHOTS: ScreenshotConfig[] = [
  {
    inputFile: 'diaries.png',
    outputName: '01_diaries.png',
    title: 'Your Personal Diary',
    subtitle: 'Voice notes, text entries & photos — all in one place',
    gradientFrom: '#F59E0B',
    gradientTo: '#EA580C',
  },
  {
    inputFile: 'AI_Generated_life_feed.png',
    outputName: '02_life_feed.png',
    title: 'AI Life Feed',
    subtitle: 'Smart daily insights generated from your diary & activities',
    gradientFrom: '#8B5CF6',
    gradientTo: '#6D28D9',
  },
  {
    inputFile: 'AI_Generated_mood_compass.png',
    outputName: '03_mood_compass.png',
    title: 'AI Mood Compass',
    subtitle: 'Track your emotional well-being with AI-powered analysis',
    gradientFrom: '#06B6D4',
    gradientTo: '#0284C7',
  },
  {
    inputFile: 'AI_Generated_Keywords.png',
    outputName: '04_keywords.png',
    title: 'AI Life Keywords',
    subtitle: 'Weekly themes auto-discovered from your life data',
    gradientFrom: '#10B981',
    gradientTo: '#059669',
  },
  {
    inputFile: 'feedFromFriends.png',
    outputName: '05_social_feed.png',
    title: 'Share Your Life',
    subtitle: 'Connect with friends through AI-powered life updates',
    gradientFrom: '#F97316',
    gradientTo: '#E11D48',
  },
];

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

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

  // Text positioning — centered in the banner area
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function generateScreenshot(config: ScreenshotConfig): Promise<void> {
  const inputPath = path.join(INPUT_DIR, config.inputFile);

  if (!fs.existsSync(inputPath)) {
    console.error(`  ✗ Input not found: ${inputPath}`);
    return;
  }

  console.log(`  Processing ${config.inputFile} → ${config.outputName}`);

  // 1. Read raw screenshot and get its dimensions
  const rawImage = sharp(inputPath);
  const rawMeta = await rawImage.metadata();
  const rawW = rawMeta.width!;
  const rawH = rawMeta.height!;

  // 2. Scale the screenshot to fit the screenshot area (below the banner)
  //    Maintain aspect ratio, fit within SCREENSHOT_AREA_HEIGHT x PRIMARY.width
  const screenshotScale = Math.min(
    PRIMARY.width / rawW,
    SCREENSHOT_AREA_HEIGHT / rawH,
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
  const yOffset = BANNER_HEIGHT; // screenshot starts right below the banner

  const primaryBuffer = await sharp(bannerBuffer)
    .resize(PRIMARY.width, PRIMARY.height) // ensure SVG renders at correct size
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
    const outDir = path.join(OUTPUT_BASE, size.label);
    fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, config.outputName);

    if (size.width === PRIMARY.width && size.height === PRIMARY.height) {
      // Primary size — write directly
      await sharp(primaryBuffer).toFile(outPath);
    } else {
      // Resize from primary
      await sharp(primaryBuffer)
        .resize(size.width, size.height, { fit: 'fill' })
        .png()
        .toFile(outPath);
    }

    console.log(`    → ${size.label}/ (${size.width}x${size.height})`);
  }
}

async function main(): Promise<void> {
  console.log('Generating App Store screenshots...\n');
  console.log(`Input:  ${INPUT_DIR}`);
  console.log(`Output: ${OUTPUT_BASE}\n`);

  for (const config of SCREENSHOTS) {
    await generateScreenshot(config);
    console.log('');
  }

  // Summary
  const total = SCREENSHOTS.length * DEVICE_SIZES.length;
  console.log(`Done! Generated ${total} screenshots (${SCREENSHOTS.length} designs × ${DEVICE_SIZES.length} sizes).`);
  console.log(`\nVerify dimensions:`);
  console.log(`  sips -g pixelWidth -g pixelHeight ${OUTPUT_BASE}/6.9/*`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
