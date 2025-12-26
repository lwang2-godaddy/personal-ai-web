/**
 * Location Correlation Service
 * Matches photo locations with existing location history
 * Uses Haversine distance to find nearby tagged locations
 */

import { calculateHaversineDistance } from '@/lib/utils/geography';
import { FirestoreService } from '@/lib/api/firebase/firestore';

export interface LocationMatch {
  locationId: string;
  distance: number; // in meters
  activity: string;
  address: string | null;
  visitCount: number;
}

export interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  activity: string;
  address: string | null;
  visitCount: number;
  timestamp: string;
}

export class LocationCorrelationService {
  private static instance: LocationCorrelationService;
  private firestoreService: FirestoreService;

  private constructor() {
    this.firestoreService = FirestoreService.getInstance();
  }

  static getInstance(): LocationCorrelationService {
    if (!LocationCorrelationService.instance) {
      LocationCorrelationService.instance = new LocationCorrelationService();
    }
    return LocationCorrelationService.instance;
  }

  /**
   * Find the closest matching location from user's history
   * @param userId - User ID
   * @param latitude - Photo latitude
   * @param longitude - Photo longitude
   * @param maxDistance - Maximum distance in meters (default: 100m)
   * @returns Closest location match or null if none found within maxDistance
   */
  async findClosestLocation(
    userId: string,
    latitude: number,
    longitude: number,
    maxDistance: number = 100
  ): Promise<LocationMatch | null> {
    // Get recent location history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const locationHistory = await this.firestoreService.getLocationData(userId, 200);

    if (locationHistory.length === 0) {
      return null;
    }

    // Filter to last 30 days and locations with activities
    const recentLocations = locationHistory.filter((loc: any) => {
      const locDate = new Date(loc.timestamp);
      return locDate >= thirtyDaysAgo && loc.activity && loc.activity !== 'Unknown';
    });

    if (recentLocations.length === 0) {
      return null;
    }

    // Calculate distances to all locations
    const locationDistances = recentLocations.map((loc: any) => {
      const distanceKm = calculateHaversineDistance(
        latitude,
        longitude,
        loc.latitude,
        loc.longitude
      );
      const distanceMeters = distanceKm * 1000;

      return {
        locationId: loc.id,
        distance: distanceMeters,
        activity: loc.activity,
        address: loc.address || null,
        visitCount: loc.visitCount || 1,
      };
    });

    // Sort by distance
    locationDistances.sort((a, b) => a.distance - b.distance);

    // Return closest if within maxDistance
    const closest = locationDistances[0];
    if (closest.distance <= maxDistance) {
      console.log('[LocationCorrelation] Found match:', {
        locationId: closest.locationId,
        activity: closest.activity,
        distance: Math.round(closest.distance),
      });
      return closest;
    }

    console.log('[LocationCorrelation] No match found within', maxDistance, 'meters');
    return null;
  }

  /**
   * Find all locations within a given radius
   * @param userId - User ID
   * @param latitude - Center latitude
   * @param longitude - Center longitude
   * @param radius - Radius in meters
   * @returns Array of matching locations sorted by distance
   */
  async findLocationsWithinRadius(
    userId: string,
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<LocationMatch[]> {
    const locationHistory = await this.firestoreService.getLocationData(userId, 200);

    const locationsWithinRadius = locationHistory
      .filter((loc: any) => loc.activity && loc.activity !== 'Unknown')
      .map((loc: any) => {
        const distanceKm = calculateHaversineDistance(
          latitude,
          longitude,
          loc.latitude,
          loc.longitude
        );
        const distanceMeters = distanceKm * 1000;

        return {
          locationId: loc.id,
          distance: distanceMeters,
          activity: loc.activity,
          address: loc.address || null,
          visitCount: loc.visitCount || 1,
        };
      })
      .filter((match) => match.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return locationsWithinRadius;
  }

  /**
   * Get popular activities from user's location history
   * Returns activities sorted by frequency
   */
  async getPopularActivities(userId: string): Promise<Array<{ activity: string; count: number }>> {
    const locationHistory = await this.firestoreService.getLocationData(userId, 500);

    const activityCounts = new Map<string, number>();

    locationHistory.forEach((loc: any) => {
      if (loc.activity && loc.activity !== 'Unknown') {
        const count = activityCounts.get(loc.activity) || 0;
        activityCounts.set(loc.activity, count + 1);
      }
    });

    const activities = Array.from(activityCounts.entries())
      .map(([activity, count]) => ({ activity, count }))
      .sort((a, b) => b.count - a.count);

    return activities;
  }

  /**
   * Suggest activity based on location history patterns
   * Uses time of day and location clustering
   */
  async suggestActivity(
    userId: string,
    latitude: number,
    longitude: number,
    timestamp: Date = new Date()
  ): Promise<string | null> {
    // Find closest location
    const match = await this.findClosestLocation(userId, latitude, longitude, 200);

    if (match) {
      return match.activity;
    }

    // If no close match, try to infer from time of day
    const hour = timestamp.getHours();

    if (hour >= 6 && hour < 9) {
      return 'Morning Routine'; // Breakfast, gym, commute
    } else if (hour >= 9 && hour < 17) {
      return 'Work'; // Work hours
    } else if (hour >= 17 && hour < 20) {
      return 'Evening Activity'; // Gym, sports, errands
    } else if (hour >= 20 && hour < 23) {
      return 'Dinner'; // Dinner, social
    } else {
      return 'Home'; // Late night/early morning
    }
  }

  /**
   * Calculate statistics about location accuracy
   */
  calculateCorrelationStats(matches: LocationMatch[]): {
    averageDistance: number;
    minDistance: number;
    maxDistance: number;
    totalMatches: number;
  } {
    if (matches.length === 0) {
      return {
        averageDistance: 0,
        minDistance: 0,
        maxDistance: 0,
        totalMatches: 0,
      };
    }

    const distances = matches.map((m) => m.distance);
    const sum = distances.reduce((a, b) => a + b, 0);

    return {
      averageDistance: sum / distances.length,
      minDistance: Math.min(...distances),
      maxDistance: Math.max(...distances),
      totalMatches: matches.length,
    };
  }
}

export default LocationCorrelationService.getInstance();
