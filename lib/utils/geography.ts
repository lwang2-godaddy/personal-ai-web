/**
 * Geography Utilities
 * Platform-agnostic geographic calculations
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1 (degrees)
 * @param lon1 Longitude of point 1 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @param lon2 Longitude of point 2 (degrees)
 * @returns Distance in kilometers
 */
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 */
export const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

/**
 * Check if two locations are within a certain distance of each other
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @param maxDistanceKm Maximum distance in kilometers
 * @returns True if points are within maxDistanceKm of each other
 */
export const isWithinDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  maxDistanceKm: number
): boolean => {
  const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  return distance <= maxDistanceKm;
};

/**
 * Format coordinates as a string
 * @param latitude Latitude
 * @param longitude Longitude
 * @param precision Decimal places (default: 6)
 * @returns Formatted string "lat, lon"
 */
export const formatCoordinates = (
  latitude: number,
  longitude: number,
  precision: number = 6
): string => {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
};

/**
 * Validate latitude value
 */
export const isValidLatitude = (lat: number): boolean => {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
};

/**
 * Validate longitude value
 */
export const isValidLongitude = (lon: number): boolean => {
  return typeof lon === 'number' && lon >= -180 && lon <= 180;
};

/**
 * Validate coordinate pair
 */
export const areValidCoordinates = (lat: number, lon: number): boolean => {
  return isValidLatitude(lat) && isValidLongitude(lon);
};
