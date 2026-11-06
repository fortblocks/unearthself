/**
 * Dynamic date formatter for Today page
 * Format: "Thursday 5th November" (ordinal, no year, weekday if fits)
 * Timezone: America/Edmonton
 * Exported for testing
 */

export function formatTodayKicker(now: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'America/Edmonton'
  });
  
  const parts = formatter.formatToParts(now);
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  
  const suffix = ['th', 'st', 'nd', 'rd'][
    day % 10 > 3 || Math.floor(day % 100 / 10) === 1 ? 0 : day % 10
  ];
  
  const withWeekday = `${weekday} ${day}${suffix} ${month}`;
  return withWeekday.length < 80 ? withWeekday : `${day}${suffix} ${month}`;
}
