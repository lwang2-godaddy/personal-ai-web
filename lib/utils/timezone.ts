/**
 * Timezone Utilities for Web App
 * Client-side timezone handling with DST support
 */

export interface TimezoneOption {
  label: string;
  value: string; // IANA timezone name
  offset: string; // e.g., "UTC-8:00"
  group: string; // Geographic group for dropdown
}

/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Error getting user timezone:', error);
    return 'America/Los_Angeles'; // Fallback
  }
}

/**
 * Get timezone offset in minutes from UTC
 */
export function getTimezoneOffset(date: Date, timezone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
}

/**
 * Format timezone offset as string
 */
export function formatTimezoneOffset(offsetMinutes: number): string {
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Get formatted timezone abbreviation (e.g., "PST", "EDT")
 */
export function getTimezoneAbbreviation(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    return parts.find((part) => part.type === 'timeZoneName')?.value || timezone;
  } catch (error) {
    return timezone;
  }
}

/**
 * Check if date is in Daylight Saving Time
 */
export function isDST(date: Date, timezone: string): boolean {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const janOffset = getTimezoneOffset(jan, timezone);
  const julOffset = getTimezoneOffset(jul, timezone);
  const currentOffset = getTimezoneOffset(date, timezone);

  // If current offset is different from January and greater, it's likely DST
  return Math.max(janOffset, julOffset) === currentOffset && janOffset !== julOffset;
}

/**
 * Format date with timezone
 */
export function formatDateWithTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
}

/**
 * Get curated list of common timezones grouped by region
 */
export function getTimezoneOptions(): TimezoneOption[] {
  const now = new Date();

  const timezones = [
    // US & Canada
    { tz: 'America/New_York', group: 'US & Canada' },
    { tz: 'America/Chicago', group: 'US & Canada' },
    { tz: 'America/Denver', group: 'US & Canada' },
    { tz: 'America/Phoenix', group: 'US & Canada' },
    { tz: 'America/Los_Angeles', group: 'US & Canada' },
    { tz: 'America/Anchorage', group: 'US & Canada' },
    { tz: 'Pacific/Honolulu', group: 'US & Canada' },
    { tz: 'America/Toronto', group: 'US & Canada' },
    { tz: 'America/Vancouver', group: 'US & Canada' },

    // Europe
    { tz: 'Europe/London', group: 'Europe' },
    { tz: 'Europe/Paris', group: 'Europe' },
    { tz: 'Europe/Berlin', group: 'Europe' },
    { tz: 'Europe/Rome', group: 'Europe' },
    { tz: 'Europe/Madrid', group: 'Europe' },
    { tz: 'Europe/Amsterdam', group: 'Europe' },
    { tz: 'Europe/Brussels', group: 'Europe' },
    { tz: 'Europe/Vienna', group: 'Europe' },
    { tz: 'Europe/Stockholm', group: 'Europe' },
    { tz: 'Europe/Moscow', group: 'Europe' },

    // Asia
    { tz: 'Asia/Tokyo', group: 'Asia' },
    { tz: 'Asia/Shanghai', group: 'Asia' },
    { tz: 'Asia/Hong_Kong', group: 'Asia' },
    { tz: 'Asia/Singapore', group: 'Asia' },
    { tz: 'Asia/Dubai', group: 'Asia' },
    { tz: 'Asia/Bangkok', group: 'Asia' },
    { tz: 'Asia/Kolkata', group: 'Asia' },
    { tz: 'Asia/Seoul', group: 'Asia' },
    { tz: 'Asia/Taipei', group: 'Asia' },

    // Australia & Pacific
    { tz: 'Australia/Sydney', group: 'Australia & Pacific' },
    { tz: 'Australia/Melbourne', group: 'Australia & Pacific' },
    { tz: 'Australia/Brisbane', group: 'Australia & Pacific' },
    { tz: 'Australia/Perth', group: 'Australia & Pacific' },
    { tz: 'Pacific/Auckland', group: 'Australia & Pacific' },

    // Latin America
    { tz: 'America/Mexico_City', group: 'Latin America' },
    { tz: 'America/Sao_Paulo', group: 'Latin America' },
    { tz: 'America/Buenos_Aires', group: 'Latin America' },
    { tz: 'America/Santiago', group: 'Latin America' },
    { tz: 'America/Lima', group: 'Latin America' },

    // Africa & Middle East
    { tz: 'Africa/Cairo', group: 'Africa & Middle East' },
    { tz: 'Africa/Johannesburg', group: 'Africa & Middle East' },
    { tz: 'Africa/Lagos', group: 'Africa & Middle East' },
    { tz: 'Asia/Jerusalem', group: 'Africa & Middle East' },
    { tz: 'Asia/Riyadh', group: 'Africa & Middle East' },
  ];

  return timezones.map(({ tz, group }) => {
    const offset = getTimezoneOffset(now, tz);
    const offsetStr = formatTimezoneOffset(offset);
    const abbr = getTimezoneAbbreviation(now, tz);
    const displayName = tz.split('/').pop()?.replace(/_/g, ' ') || tz;

    return {
      label: `${displayName} (${abbr})`,
      value: tz,
      offset: offsetStr,
      group,
    };
  });
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get timezone display name
 */
export function getTimezoneDisplayName(timezone: string): string {
  try {
    const now = new Date();
    const abbr = getTimezoneAbbreviation(now, timezone);
    const displayName = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
    return `${displayName} (${abbr})`;
  } catch (error) {
    return timezone;
  }
}

/**
 * Convert date from one timezone to another
 */
export function convertTimezone(date: Date, fromTz: string, toTz: string): Date {
  // Get the date string in the source timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: fromTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  // Create ISO string
  const isoString = `${getValue('year')}-${getValue('month')}-${getValue('day')}T${getValue('hour')}:${getValue('minute')}:${getValue('second')}`;

  // Parse in target timezone
  return new Date(new Date(isoString).toLocaleString('en-US', { timeZone: toTz }));
}
