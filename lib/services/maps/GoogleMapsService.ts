/**
 * GoogleMapsService - Web version
 * Handles Google Maps Distance Matrix API with caching and rate limiting
 */

interface TravelTimeResult {
  durationMinutes: number;
  distanceMeters: number;
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'ERROR';
}

interface CacheEntry {
  result: TravelTimeResult;
  timestamp: number;
}

class GoogleMapsService {
  private static instance: GoogleMapsService;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private maxCacheSize = 1000;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private requestsPerSecond = 50;
  private minRequestInterval = 1000 / this.requestsPerSecond; // 20ms between requests

  private constructor() {
    // Clean up old cache entries on startup
    this.cleanCache();
  }

  static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  /**
   * Calculate travel time between two locations
   */
  async calculateTravelTime(
    origin: string,
    destination: string,
    departureTime?: Date,
    mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving'
  ): Promise<TravelTimeResult> {
    // Check if locations are the same
    if (this.isSameLocation(origin, destination)) {
      return {
        durationMinutes: 0,
        distanceMeters: 0,
        status: 'OK',
      };
    }

    // Generate cache key
    const hour = departureTime ? departureTime.getHours() : new Date().getHours();
    const cacheKey = this.generateCacheKey(origin, destination, mode, hour);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Add to request queue with rate limiting
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.fetchTravelTime(origin, destination, departureTime, mode);
          this.setCache(cacheKey, result);
          resolve(result);
        } catch (error) {
          console.error('[GoogleMapsService] Error fetching travel time:', error);
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Fetch travel time from Google Maps API
   */
  private async fetchTravelTime(
    origin: string,
    destination: string,
    departureTime?: Date,
    mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving'
  ): Promise<TravelTimeResult> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('[GoogleMapsService] Google Maps API key not configured');
      // Return default 30-minute buffer if API key is missing
      return {
        durationMinutes: 30,
        distanceMeters: 0,
        status: 'ERROR',
      };
    }

    try {
      const params = new URLSearchParams({
        origins: origin,
        destinations: destination,
        mode: mode,
        key: apiKey,
      });

      // Add departure time for traffic-aware results (driving mode only)
      if (mode === 'driving' && departureTime) {
        params.append('departure_time', Math.floor(departureTime.getTime() / 1000).toString());
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        console.warn('[GoogleMapsService] API returned non-OK status:', data.status);
        return {
          durationMinutes: 30,
          distanceMeters: 0,
          status: 'ERROR',
        };
      }

      const element = data.rows?.[0]?.elements?.[0];

      if (!element || element.status !== 'OK') {
        console.warn('[GoogleMapsService] No valid route found');
        return {
          durationMinutes: 30,
          distanceMeters: 0,
          status: element?.status || 'ZERO_RESULTS',
        };
      }

      // Use duration_in_traffic if available (driving mode with departure_time)
      const durationSeconds = element.duration_in_traffic?.value || element.duration?.value || 0;
      const distanceMeters = element.distance?.value || 0;

      return {
        durationMinutes: Math.ceil(durationSeconds / 60),
        distanceMeters,
        status: 'OK',
      };
    } catch (error) {
      console.error('[GoogleMapsService] API request failed:', error);
      // Return default 30-minute buffer on error
      return {
        durationMinutes: 30,
        distanceMeters: 0,
        status: 'ERROR',
      };
    }
  }

  /**
   * Process request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        // Wait before processing next request (rate limiting)
        await new Promise((resolve) => setTimeout(resolve, this.minRequestInterval));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    origin: string,
    destination: string,
    mode: string,
    hour: number
  ): string {
    // Normalize locations to lowercase and remove extra spaces
    const normalizedOrigin = origin.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedDestination = destination.toLowerCase().trim().replace(/\s+/g, ' ');

    // Include hour in cache key for time-sensitive results
    return `${normalizedOrigin}|${normalizedDestination}|${mode}|${hour}`;
  }

  /**
   * Check if two locations are the same
   */
  private isSameLocation(location1: string, location2: string): boolean {
    const normalized1 = location1.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalized2 = location2.toLowerCase().trim().replace(/\s+/g, ' ');
    return normalized1 === normalized2;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): TravelTimeResult | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    const now = Date.now();
    if (now - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, result: TravelTimeResult): void {
    // Enforce max cache size (LRU eviction)
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.cacheTTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    console.log(
      `[GoogleMapsService] Cleaned ${keysToDelete.length} expired cache entries. Cache size: ${this.cache.size}`
    );
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[GoogleMapsService] Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

export default GoogleMapsService.getInstance();
