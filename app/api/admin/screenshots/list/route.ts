import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import * as path from 'path';
import * as fs from 'fs';

export const dynamic = 'force-dynamic';

/** Device sizes for App Store screenshots */
const DEVICE_SIZES = [
  { label: '6.9', width: 1320, height: 2868 },
  { label: '6.7', width: 1290, height: 2796 },
  { label: '6.5', width: 1284, height: 2778 },
  { label: '5.5', width: 1242, height: 2208 },
];

/** Default screenshot configurations */
const DEFAULT_CONFIGS = [
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
  {
    inputFile: 'ChatWithAIAboutMyself.png',
    outputName: '06_chat_ai.png',
    title: 'Ask Your AI Anything',
    subtitle: 'Get instant answers about your health, habits & activities',
    gradientFrom: '#3B82F6',
    gradientTo: '#1D4ED8',
  },
];

// Get screenshots directory path - works in both dev and when running from different locations
function getScreenshotsDir(): string {
  // Try environment variable first
  if (process.env.SCREENSHOTS_DIR) {
    return process.env.SCREENSHOTS_DIR;
  }

  // Try relative path from project root
  const projectRoot = process.cwd();
  const relativePath = path.join(projectRoot, '..', 'PersonalAIApp', 'screenshots');
  if (fs.existsSync(relativePath)) {
    return relativePath;
  }

  // Fallback: try to find based on common project structure
  // When running from personal-ai-web, go up to personal/ then into PersonalAIApp/
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

  return relativePath; // Return default even if not found (will handle gracefully)
}

export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const screenshotsDir = getScreenshotsDir();
    const appstoreDir = path.join(screenshotsDir, 'appstore');

    console.log('[Screenshots] Looking for screenshots in:', screenshotsDir);
    console.log('[Screenshots] Directory exists:', fs.existsSync(screenshotsDir));

    // Get raw screenshots (exclude appstore folder and hidden files)
    let rawScreenshots: string[] = [];
    if (fs.existsSync(screenshotsDir)) {
      rawScreenshots = fs
        .readdirSync(screenshotsDir)
        .filter((file) => {
          const filePath = path.join(screenshotsDir, file);
          return (
            fs.statSync(filePath).isFile() &&
            file.endsWith('.png') &&
            !file.startsWith('.')
          );
        })
        .sort();
    }

    // Get generated screenshots per size
    const generatedScreenshots: { size: string; files: string[] }[] = [];
    if (fs.existsSync(appstoreDir)) {
      for (const size of DEVICE_SIZES) {
        const sizeDir = path.join(appstoreDir, size.label);
        if (fs.existsSync(sizeDir)) {
          const files = fs
            .readdirSync(sizeDir)
            .filter((file) => file.endsWith('.png') && !file.startsWith('.'))
            .sort();
          generatedScreenshots.push({ size: size.label, files });
        }
      }
    }

    // Try to load saved config from a JSON file (if exists)
    const configPath = path.join(screenshotsDir, 'screenshot-config.json');
    let config = DEFAULT_CONFIGS;
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(configContent);
      } catch (err) {
        console.error('Failed to parse screenshot config:', err);
      }
    }

    return NextResponse.json({
      rawScreenshots,
      generatedScreenshots,
      config,
      deviceSizes: DEVICE_SIZES,
      _debug: {
        screenshotsDir,
        exists: fs.existsSync(screenshotsDir),
        cwd: process.cwd(),
      },
    });
  } catch (error: any) {
    console.error('[Screenshots List] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list screenshots' },
      { status: 500 }
    );
  }
}
