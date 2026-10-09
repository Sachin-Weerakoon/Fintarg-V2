/**
 * Returns YYYY-MM formatted string in local time, preventing UTC boundary shifts in Asia/Colombo.
 */
export function getLocalMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns time-aware greeting ('Good morning', 'Good afternoon', 'Good evening') based on local time.
 */
export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
