/**
 * Test date formatting: "5th November" with weekday if fits
 */

function getTodayKicker(testDate?: Date): string {
  const today = testDate || new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Edmonton'
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(today);
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  
  // Ordinal suffix
  const suffix = ['th', 'st', 'nd', 'rd'][
    day % 10 > 3 || Math.floor(day % 100 / 10) === 1 ? 0 : day % 10
  ];
  
  // Add weekday if it fits (< 80 chars total for header)
  const weekdayFormatter = new Intl.DateTimeFormat('en-US', { 
    weekday: 'long',
    timeZone: 'America/Edmonton'
  });
  const weekday = weekdayFormatter.format(today);
  const withWeekday = `${weekday} ${day}${suffix} ${month}`;
  
  return withWeekday.length < 80 ? withWeekday : `${day}${suffix} ${month}`;
}

console.log('Date Format Tests:\n');

// Test various dates
const testDates = [
  { date: new Date('2026-11-05'), expected: 'Wednesday 5th November' },
  { date: new Date('2026-11-01'), expected: 'Sunday 1st November' },
  { date: new Date('2026-11-02'), expected: 'Monday 2nd November' },
  { date: new Date('2026-11-03'), expected: 'Tuesday 3rd November' },
  { date: new Date('2026-11-11'), expected: 'Wednesday 11th November' },
  { date: new Date('2026-11-21'), expected: 'Saturday 21st November' },
  { date: new Date('2026-11-22'), expected: 'Sunday 22nd November' },
  { date: new Date('2026-11-23'), expected: 'Monday 23rd November' },
];

for (const test of testDates) {
  const result = getTodayKicker(test.date);
  const match = result === test.expected ? '✅' : '⚠️';
  console.log(match + ' ' + test.date.toISOString().split('T')[0] + ': ' + result);
  if (result !== test.expected) {
    console.log('   Expected: ' + test.expected);
  }
}

console.log('\nFormat: Weekday DDth Month (no year, ordinal suffix)');
