/**
 * Geolocation Service
 * Wraps browser Geolocation API and handles reverse geocoding
 */

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string | null;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export class GeolocationService {
  private static instance: GeolocationService;

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  /**
   * Check if geolocation is available in browser
   */
  isAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Get current position
   * @param options Geolocation options
   * @returns Promise with latitude, longitude, accuracy
   */
  async getCurrentPosition(
    options: GeolocationOptions = {}
  ): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    if (!this.isAvailable()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          // Map GeolocationPositionError to readable messages
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location permission denied'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location unavailable'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out'));
              break;
            default:
              reject(new Error('Unknown geolocation error'));
          }
        },
        defaultOptions
      );
    });
  }

  /**
   * Reverse geocode coordinates to human-readable address
   * Uses OpenStreetMap Nominatim API (free, no API key required)
   * @param latitude Latitude
   * @param longitude Longitude
   * @returns Promise with address string or null if failed
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PersonalAI-WebApp/1.0',
          },
        }
      );

      if (!response.ok) {
        console.warn('Reverse geocoding failed:', response.statusText);
        return null;
      }

      const data = await response.json();

      // Extract address from Nominatim response
      if (data.display_name) {
        return data.display_name;
      }

      // Fallback: construct address from components
      const { road, house_number, city, town, village, state, country } = data.address || {};
      const parts = [
        house_number && road ? `${house_number} ${road}` : road,
        city || town || village,
        state,
        country,
      ].filter(Boolean);

      return parts.length > 0 ? parts.join(', ') : null;
    } catch (error) {
      console.warn('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Get current position with address
   * Combines getCurrentPosition() and reverseGeocode()
   * @param options Geolocation options
   * @returns Promise with full geolocation result including address
   */
  async getCurrentPositionWithAddress(
    options: GeolocationOptions = {}
  ): Promise<GeolocationResult> {
    // Get position
    const position = await this.getCurrentPosition(options);

    // Reverse geocode (non-blocking - continue if fails)
    let address: string | null = null;
    try {
      address = await this.reverseGeocode(position.latitude, position.longitude);
    } catch (error) {
      console.warn('Failed to get address:', error);
    }

    return {
      ...position,
      address,
    };
  }

  /**
   * Watch position changes (for continuous tracking)
   * @param onSuccess Callback for position updates
   * @param onError Callback for errors
   * @param options Geolocation options
   * @returns Watch ID (use clearWatch() to stop)
   */
  watchPosition(
    onSuccess: (result: { latitude: number; longitude: number; accuracy: number }) => void,
    onError?: (error: Error) => void,
    options: GeolocationOptions = {}
  ): number {
    if (!this.isAvailable()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    return navigator.geolocation.watchPosition(
      (position) => {
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (onError) {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              onError(new Error('Location permission denied'));
              break;
            case error.POSITION_UNAVAILABLE:
              onError(new Error('Location unavailable'));
              break;
            case error.TIMEOUT:
              onError(new Error('Location request timed out'));
              break;
            default:
              onError(new Error('Unknown geolocation error'));
          }
        }
      },
      defaultOptions
    );
  }

  /**
   * Stop watching position
   * @param watchId Watch ID returned by watchPosition()
   */
  clearWatch(watchId: number): void {
    if (this.isAvailable()) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Format coordinates as string
   * @param latitude Latitude
   * @param longitude Longitude
   * @param precision Decimal places (default: 6)
   * @returns Formatted string "lat, lon"
   */
  formatCoordinates(
    latitude: number,
    longitude: number,
    precision: number = 6
  ): string {
    return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
  }
}

// Export singleton instance
export default GeolocationService.getInstance();
