/**
 * With `timezone=auto`, Open-Meteo returns local wall-clock strings without an
 * offset ("2025-08-05T15:00"). Passing them to `new Date()` would reinterpret
 * them in the *browser's* timezone (and hit DST gaps), so we read the date
 * parts directly and format them as UTC to keep the location's local values.
 */

function toUtcDate(isoString) {
  const [year, month, day] = isoString.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const formatter = (options) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options });

const longDate = formatter({ weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
const longWeekday = formatter({ weekday: 'long' });
const shortWeekday = formatter({ weekday: 'short' });

export const formatLongDate = (isoString) => longDate.format(toUtcDate(isoString));
export const formatLongWeekday = (isoString) => longWeekday.format(toUtcDate(isoString));
export const formatShortWeekday = (isoString) => shortWeekday.format(toUtcDate(isoString));

/** "2025-08-05T15:00" -> "3 PM" */
export function formatHour(isoString) {
  const hour = Number(isoString.slice(11, 13));
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** "2025-08-05T15:00" -> "2025-08-05" */
export const toDateKey = (isoString) => isoString.slice(0, 10);

/** "2025-08-05T15:37" -> "2025-08-05T15" (comparable as a string) */
export const toHourKey = (isoString) => isoString.slice(0, 13);
