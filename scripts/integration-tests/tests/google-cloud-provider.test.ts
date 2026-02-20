/**
 * Google Cloud Provider Integration Tests
 *
 * Tests Google Cloud AI services (TTS, STT, Gemini) to verify API key is working.
 *
 * Run: npx tsx scripts/integration-tests/tests/google-cloud-provider.test.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { TestResult } from '../lib/test-utils';

// Load environment variables from mobile app .env
const mobileEnvPath = path.resolve(__dirname, '../../../../PersonalAIApp/.env');
if (fs.existsSync(mobileEnvPath)) {
  dotenv.config({ path: mobileEnvPath });
}

// Also try web .env.local
const webEnvPath = path.resolve(__dirname, '../../../.env.local');
if (fs.existsSync(webEnvPath)) {
  dotenv.config({ path: webEnvPath });
}

// Get API key from environment
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

// API endpoints
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TTS_API_BASE = 'https://texttospeech.googleapis.com/v1';
const STT_API_BASE = 'https://speech.googleapis.com/v1';

/**
 * Test 1: Verify API Key is Valid (List Models)
 */
async function testApiKeyValid(): Promise<TestResult> {
  const name = 'Google Cloud API Key Valid';
  const startTime = Date.now();

  if (!GOOGLE_CLOUD_API_KEY) {
    return {
      name,
      passed: false,
      error: 'GOOGLE_CLOUD_API_KEY not found in environment',
      duration: Date.now() - startTime,
    };
  }

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models?key=${GOOGLE_CLOUD_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name,
        passed: false,
        error: `API returned ${response.status}: ${errorText}`,
        duration: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const modelCount = data.models?.length || 0;

    return {
      name,
      passed: true,
      reason: `API key is valid. Found ${modelCount} available models.`,
      details: {
        modelCount,
        sampleModels: data.models?.slice(0, 3).map((m: any) => m.name) || [],
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: `Request failed: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 2: Gemini Chat Completion
 */
async function testGeminiChat(): Promise<TestResult> {
  const name = 'Gemini Chat Completion';
  const startTime = Date.now();

  if (!GOOGLE_CLOUD_API_KEY) {
    return {
      name,
      passed: false,
      skipped: true,
      error: 'GOOGLE_CLOUD_API_KEY not found',
      duration: Date.now() - startTime,
    };
  }

  try {
    const model = 'gemini-2.0-flash';
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: 'Say "Hello from Gemini!" in exactly 5 words.' }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 50,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name,
        passed: false,
        error: `Gemini API returned ${response.status}: ${errorText}`,
        duration: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!content) {
      return {
        name,
        passed: false,
        error: 'No content in Gemini response',
        details: data,
        duration: Date.now() - startTime,
      };
    }

    return {
      name,
      passed: true,
      reason: `Gemini responded successfully`,
      details: {
        model,
        response: content.substring(0, 100),
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: `Gemini request failed: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 3: Google Cloud Text-to-Speech
 */
async function testGoogleTTS(): Promise<TestResult> {
  const name = 'Google Cloud TTS';
  const startTime = Date.now();

  if (!GOOGLE_CLOUD_API_KEY) {
    return {
      name,
      passed: false,
      skipped: true,
      error: 'GOOGLE_CLOUD_API_KEY not found',
      duration: Date.now() - startTime,
    };
  }

  try {
    const response = await fetch(
      `${TTS_API_BASE}/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: 'Hello, this is a test of Google Cloud Text to Speech.' },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Neural2-C',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name,
        passed: false,
        error: `TTS API returned ${response.status}: ${errorText}`,
        duration: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      return {
        name,
        passed: false,
        error: 'No audio content in TTS response',
        duration: Date.now() - startTime,
      };
    }

    // Decode base64 to check size
    const audioBuffer = Buffer.from(audioContent, 'base64');
    const audioSizeKB = (audioBuffer.length / 1024).toFixed(2);

    return {
      name,
      passed: true,
      reason: `TTS generated ${audioSizeKB} KB of audio`,
      details: {
        voice: 'en-US-Neural2-C',
        audioSizeKB,
        encoding: 'MP3',
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: `TTS request failed: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 4: List Available TTS Voices
 */
async function testListTTSVoices(): Promise<TestResult> {
  const name = 'List TTS Voices';
  const startTime = Date.now();

  if (!GOOGLE_CLOUD_API_KEY) {
    return {
      name,
      passed: false,
      skipped: true,
      error: 'GOOGLE_CLOUD_API_KEY not found',
      duration: Date.now() - startTime,
    };
  }

  try {
    const response = await fetch(
      `${TTS_API_BASE}/voices?key=${GOOGLE_CLOUD_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name,
        passed: false,
        error: `Voices API returned ${response.status}: ${errorText}`,
        duration: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const voices = data.voices || [];
    const neural2Voices = voices.filter((v: any) => v.name?.includes('Neural2'));
    const englishVoices = voices.filter((v: any) => v.languageCodes?.includes('en-US'));

    return {
      name,
      passed: true,
      reason: `Found ${voices.length} voices (${neural2Voices.length} Neural2)`,
      details: {
        totalVoices: voices.length,
        neural2Count: neural2Voices.length,
        englishUSCount: englishVoices.length,
        sampleVoices: neural2Voices.slice(0, 5).map((v: any) => v.name),
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: `Voices request failed: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 5: Gemini Embedding (text-embedding-004)
 */
async function testGeminiEmbedding(): Promise<TestResult> {
  const name = 'Gemini Embedding';
  const startTime = Date.now();

  if (!GOOGLE_CLOUD_API_KEY) {
    return {
      name,
      passed: false,
      skipped: true,
      error: 'GOOGLE_CLOUD_API_KEY not found',
      duration: Date.now() - startTime,
    };
  }

  try {
    const model = 'gemini-embedding-001';
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:embedContent?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            parts: [{ text: 'This is a test sentence for embedding generation.' }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name,
        passed: false,
        error: `Embedding API returned ${response.status}: ${errorText}`,
        duration: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const embedding = data.embedding?.values || [];

    if (embedding.length === 0) {
      return {
        name,
        passed: false,
        error: 'No embedding values in response',
        duration: Date.now() - startTime,
      };
    }

    return {
      name,
      passed: true,
      reason: `Generated embedding with ${embedding.length} dimensions`,
      details: {
        model,
        dimensions: embedding.length,
        sampleValues: embedding.slice(0, 5).map((v: number) => v.toFixed(6)),
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: `Embedding request failed: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('\n========================================');
  console.log('  Google Cloud Provider Integration Tests');
  console.log('========================================\n');

  if (!GOOGLE_CLOUD_API_KEY) {
    console.log('ERROR: GOOGLE_CLOUD_API_KEY not found in environment!\n');
    console.log('Make sure the key is set in:');
    console.log('  - PersonalAIApp/.env');
    console.log('  - OR personal-ai-web/.env.local\n');
    process.exit(1);
  }

  console.log(`API Key: ${GOOGLE_CLOUD_API_KEY.substring(0, 10)}...${GOOGLE_CLOUD_API_KEY.slice(-4)}\n`);

  const tests = [
    testApiKeyValid,
    testGeminiChat,
    testGoogleTTS,
    testListTTSVoices,
    testGeminiEmbedding,
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    process.stdout.write(`Running: ${test.name}... `);
    const result = await test();
    results.push(result);

    if (result.passed) {
      console.log(`PASSED (${result.duration}ms)`);
      if (result.reason) {
        console.log(`  ${result.reason}`);
      }
    } else if (result.skipped) {
      console.log('SKIPPED');
      console.log(`  ${result.error}`);
    } else {
      console.log(`FAILED (${result.duration}ms)`);
      console.log(`  ${result.error}`);
    }
    console.log('');
  }

  // Summary
  console.log('========================================');
  console.log('  Summary');
  console.log('========================================\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;

  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${results.length}\n`);

  if (failed > 0) {
    console.log('Some tests failed. Check the output above for details.\n');
    process.exit(1);
  } else {
    console.log('All tests passed! Google Cloud provider is working correctly.\n');
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
