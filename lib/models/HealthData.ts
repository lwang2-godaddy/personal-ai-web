export type HealthDataType = 'steps' | 'workout' | 'sleep' | 'heartRate';

export interface HealthData {
  id?: string;
  userId: string;
  type: HealthDataType;
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  source: 'healthkit' | 'googlefit';
  metadata: HealthDataMetadata;
  syncedAt: string | null;
  embeddingId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HealthDataMetadata {
  workoutType?: string;
  workoutDuration?: number;
  sleepQuality?: 'deep' | 'light' | 'rem' | 'awake';
  heartRateZone?: 'resting' | 'fat-burn' | 'cardio' | 'peak';
  calories?: number;
  distance?: number;
  [key: string]: any;
}

export interface HealthDataSummary {
  date: string;
  steps: number;
  workouts: number;
  sleepHours: number;
  averageHeartRate: number;
}
