export interface VectorMetadata {
  userId: string;
  type: 'health' | 'location' | 'voice' | 'photo' | 'shared_activity';
  date: string;
  activity?: string;
  participants?: string[];
  [key: string]: any;
}

export interface PineconeVector {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface PineconeQueryResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}
