/**
 * Infrastructure Cost Models
 * TypeScript interfaces for tracking infrastructure costs
 * across Firebase, Pinecone, and other cloud services
 */

/**
 * Service types for infrastructure cost tracking
 */
export type InfrastructureService = 'firestore' | 'storage' | 'functions' | 'pinecone_storage';

/**
 * Operation types for each service
 */
export type FirestoreOperation = 'read' | 'write' | 'delete';
export type StorageOperation = 'upload' | 'download' | 'storage_snapshot';
export type FunctionsOperation = 'invocation';
export type PineconeStorageOperation = 'storage_snapshot';

export type InfrastructureOperation =
  | FirestoreOperation
  | StorageOperation
  | FunctionsOperation
  | PineconeStorageOperation;

/**
 * Infrastructure cost event stored in Firestore
 */
export interface InfrastructureCostEvent {
  id: string;
  service: InfrastructureService;
  operation: InfrastructureOperation;
  timestamp: string; // ISO 8601
  quantity: number;
  unit: string; // 'operations', 'bytes', 'gb_seconds', etc.
  estimatedCostUSD: number;
  userId?: string; // Optional - some costs are system-wide
  metadata?: Record<string, any>;
}

/**
 * Firestore-specific cost event
 */
export interface FirestoreCostEvent extends InfrastructureCostEvent {
  service: 'firestore';
  operation: FirestoreOperation;
  unit: 'operations';
  metadata?: {
    collection?: string;
    aggregationPeriod?: string; // 'minute', 'hour', etc.
  };
}

/**
 * Storage-specific cost event
 */
export interface StorageCostEvent extends InfrastructureCostEvent {
  service: 'storage';
  operation: StorageOperation;
  unit: 'bytes' | 'gb';
  metadata?: {
    bucket?: string;
    path?: string;
  };
}

/**
 * Cloud Functions-specific cost event
 */
export interface FunctionsCostEvent extends InfrastructureCostEvent {
  service: 'functions';
  operation: 'invocation';
  unit: 'invocations';
  metadata?: {
    functionName: string;
    durationMs: number;
    memoryMB: number;
    gbSeconds: number;
    success: boolean;
  };
}

/**
 * Pinecone storage-specific cost event
 */
export interface PineconeStorageCostEvent extends InfrastructureCostEvent {
  service: 'pinecone_storage';
  operation: 'storage_snapshot';
  unit: 'gb';
  metadata?: {
    mainIndexVectors?: number;
    mainIndexStorageGB?: number;
    visualIndexVectors?: number;
    visualIndexStorageGB?: number;
    totalStorageGB: number;
  };
}

/**
 * Aggregated infrastructure costs for a date range
 */
export interface AggregatedInfrastructureCosts {
  firestore: {
    reads: number;
    writes: number;
    deletes: number;
    cost: number;
  };
  storage: {
    uploadBytes: number;
    downloadBytes: number;
    storageGB: number;
    cost: number;
  };
  functions: {
    invocations: number;
    gbSeconds: number;
    cost: number;
  };
  pinecone: {
    storageGB: number;
    vectors: number;
    cost: number;
  };
}

/**
 * Infrastructure cost totals
 */
export interface InfrastructureCostTotals {
  firestore: number;
  storage: number;
  functions: number;
  pinecone: number;
  grandTotal: number;
}

/**
 * Full infrastructure cost response from API
 */
export interface InfrastructureCostResponse {
  infrastructure: AggregatedInfrastructureCosts;
  totals: InfrastructureCostTotals;
  startDate: string;
  endDate: string;
}

/**
 * Combined cost response (OpenAI + Infrastructure)
 */
export interface CombinedCostResponse {
  openai: {
    totalCost: number;
    totalApiCalls: number;
    totalTokens: number;
  };
  infrastructure: AggregatedInfrastructureCosts;
  totals: {
    openai: number;
    infrastructure: number;
    grandTotal: number;
  };
  startDate: string;
  endDate: string;
}
