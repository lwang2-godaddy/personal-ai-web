import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Screenshots are only available in development mode.' },
      { status: 403 }
    );
  }

  try {
    // Ensure screenshots directory exists
    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `demo-screenshot-${timestamp}.png`;
    const filePath = path.join(screenshotsDir, filename);

    // Capture iOS Simulator screenshot
    await execAsync(`xcrun simctl io booted screenshot "${filePath}"`);

    // Verify file was created
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Screenshot file was not created. Is the iOS Simulator running?' },
        { status: 500 }
      );
    }

    const stats = fs.statSync(filePath);

    return NextResponse.json({
      path: `/screenshots/${filename}`,
      filename,
      size: stats.size,
    });
  } catch (error: any) {
    console.error('[Demo Screenshot] Error:', error);

    const message = error.message?.includes('booted')
      ? 'No booted iOS Simulator found. Please start a simulator first.'
      : error.message || 'Failed to capture screenshot';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
