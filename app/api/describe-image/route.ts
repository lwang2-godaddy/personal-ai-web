import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import UsageTracker from '@/lib/services/usage/UsageTracker';
import OpenAI from 'openai';

// Initialize OpenAI client for direct API calls
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/describe-image
 * Generate description for an image using OpenAI Vision API (GPT-4 Vision)
 *
 * Body:
 * - imageUrl: string - Public URL of the image (Firebase Storage URL or other)
 *
 * Returns:
 * - description: string - Generated description
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const userId = user.uid;

    // Check usage limits
    const canProceed = await UsageTracker.checkLimits(userId);
    if (!canProceed) {
      return NextResponse.json(
        { error: 'Usage limit exceeded' },
        { status: 429 }
      );
    }

    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid imageUrl' },
        { status: 400 }
      );
    }

    console.log('[DescribeImage] Processing image:', imageUrl);

    // Call OpenAI Vision API
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 with vision capabilities (gpt-4-vision-preview is deprecated)
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in 2-3 sentences. Focus on what is happening, who or what is in the image, and any notable details. Write naturally as if you were the person who took the photo.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'auto', // or 'low' / 'high' for different token usage
              },
            },
          ],
        },
      ],
      max_tokens: 150,
    });

    const elapsedTime = Date.now() - startTime;
    console.log('[DescribeImage] Vision API completed in', elapsedTime, 'ms');

    // Extract description
    const description = response.choices[0]?.message?.content?.trim() || '';

    if (description.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate description - empty response' },
        { status: 422 }
      );
    }

    // Track usage
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    await UsageTracker.trackImageDescription(userId, promptTokens, completionTokens, 'api_describe_image');

    console.log('[DescribeImage] Generated description:', {
      length: description.length,
      preview: description.substring(0, 100),
    });

    return NextResponse.json(
      {
        description,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[DescribeImage] Error:', error);

    // Handle specific OpenAI errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key' },
          { status: 500 }
        );
      }

      if (status === 429) {
        return NextResponse.json(
          { error: 'OpenAI API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (status === 400 && message.includes('image')) {
        return NextResponse.json(
          { error: 'Invalid image URL or image could not be processed' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `OpenAI API error: ${message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Failed to describe image: ${error.message}` },
      { status: 500 }
    );
  }
}
