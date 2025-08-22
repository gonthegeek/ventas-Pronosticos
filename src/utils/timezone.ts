/**
 * Timezone utilities for Mexico City (UTC-6)
 * All sales data is stored and displayed in Mexico City timezone
 */

export const MEXICO_TIMEZONE_OFFSET = -6; // UTC-6

/**
 * Convert a date to Mexico City timezone
 */
export function toMexicoTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.getTime() + (MEXICO_TIMEZONE_OFFSET * 60 * 60 * 1000));
}

/**
 * Convert a Mexico time to UTC for storage
 */
export function fromMexicoTime(mexicoDate: Date): Date {
  return new Date(mexicoDate.getTime() - (MEXICO_TIMEZONE_OFFSET * 60 * 60 * 1000));
}

/**
 * Format a date string for display in Mexico timezone
 */
export function formatMexicoDateTime(isoString: string): string {
  const date = new Date(isoString);
  const mexicoDate = toMexicoTime(date);
  
  return mexicoDate.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Get current Mexico time as ISO string
 */
export function getMexicoTimeISO(): string {
  const now = new Date();
  const mexicoTime = toMexicoTime(now);
  return mexicoTime.toISOString();
}

/**
 * Create date range for a specific date in Mexico timezone
 */
export function getMexicoDateRange(dateString: string): { start: Date; end: Date } {
  // Parse the date as Mexico time
  const baseDate = new Date(dateString + 'T00:00:00.000-06:00');
  
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Format hour as time period (e.g., "13:00 - 14:00")
 * Handles the special case of hour 0 (midnight) showing as "23:00 - 00:00"
 */
export function formatHourAsPeriod(hour: number): string {
  const startHour = hour === 0 ? 23 : hour - 1;
  const endHour = hour;
  
  return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
}

/**
 * Format currency value for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
