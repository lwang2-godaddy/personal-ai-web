/**
 * Pinecone initialization for integration tests
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local (three levels up from lib/)
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env.local') });

/**
 * Initialize Pinecone client
 */
export function initPinecone(): Pinecone {
  const apiKey = process.env.PINECONE_API_KEY ||
                 process.env.NEXT_PUBLIC_PINECONE_API_KEY ||
                 process.env.PINECONE_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }
  return new Pinecone({ apiKey });
}

/**
 * Get Pinecone index name from environment
 */
export function getPineconeIndex(): string {
  return process.env.NEXT_PUBLIC_PINECONE_INDEX ||
         process.env.PINECONE_INDEX ||
         'personal-ai-data';
}
