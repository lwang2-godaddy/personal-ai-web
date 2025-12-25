export interface LocationData {
  id?: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  activity: string | null;
  activityTaggedAt: string | null;
  address: string;
  duration: number;
  visitCount: number;
  embeddingId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationVisit {
  locationId: string;
  latitude: number;
  longitude: number;
  activity: string | null;
  firstVisit: string;
  lastVisit: string;
  visitCount: number;
  totalDuration: number;
}

export interface ActivityTag {
  activity: string;
  icon?: string;
  color?: string;
}
