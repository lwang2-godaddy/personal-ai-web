import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { spawn } from 'child_process';
import * as path from 'path';
import type { DemoProgressEvent } from '@/lib/services/demo/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for full test suite

export async function POST(request: NextRequest) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  let body: { filter?: string; skipE2E?: boolean; e2eOnly?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // Use defaults
  }

  const { filter, skipE2E, e2eOnly } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: DemoProgressEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream may be closed
        }
      };

      send({ phase: 0, phaseName: 'Setup', level: 'info', message: 'Starting integration test runner...' });

      // Build CLI arguments
      const args: string[] = [];
      if (filter) {
        args.push('--filter', filter);
      }
      if (skipE2E) {
        args.push('--skip-e2e');
      }
      if (e2eOnly) {
        args.push('--e2e-only');
      }

      const scriptPath = path.join(process.cwd(), 'scripts', 'integration-tests', 'run-all.ts');

      send({ phase: 0, phaseName: 'Setup', level: 'info', message: `Running: npx tsx ${path.basename(scriptPath)} ${args.join(' ')}` });

      const child = spawn('npx', ['tsx', scriptPath, ...args], {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let currentPhase = 1;
      let outputBuffer = '';

      const processLine = (line: string, isStderr = false) => {
        if (!line.trim()) return;

        // Strip ANSI escape codes for clean output
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');

        // Detect phase changes from section headers
        if (cleanLine.includes('=====') || cleanLine.includes('─────')) {
          currentPhase++;
        }

        // Detect pass/fail
        let level: DemoProgressEvent['level'] = 'info';
        if (cleanLine.includes('✓') || cleanLine.includes('PASS') || cleanLine.includes('passed')) {
          level = 'success';
        } else if (cleanLine.includes('✗') || cleanLine.includes('FAIL') || cleanLine.includes('failed')) {
          level = 'error';
        } else if (cleanLine.includes('⚠') || cleanLine.includes('WARNING')) {
          level = 'warning';
        }

        if (isStderr) {
          level = 'warning';
        }

        send({
          phase: currentPhase,
          phaseName: 'Tests',
          level,
          message: cleanLine,
        });
      };

      child.stdout.on('data', (data: Buffer) => {
        outputBuffer += data.toString();
        const lines = outputBuffer.split('\n');
        outputBuffer = lines.pop() || '';
        lines.forEach(line => processLine(line));
      });

      child.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => processLine(line, true));
      });

      child.on('close', (code) => {
        // Process any remaining buffer
        if (outputBuffer.trim()) {
          processLine(outputBuffer);
        }

        send({
          phase: 99,
          phaseName: 'Complete',
          level: code === 0 ? 'success' : 'error',
          message: code === 0 ? 'All tests passed!' : `Tests completed with exit code ${code}`,
        });

        controller.close();
      });

      child.on('error', (err) => {
        send({
          phase: -1,
          phaseName: 'Error',
          level: 'error',
          message: `Failed to start test runner: ${err.message}`,
        });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
