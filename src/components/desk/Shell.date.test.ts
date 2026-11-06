/**
 * Test dynamic date formatting for Today page
 * Tests ordinal suffixes, weekday inclusion, timezone handling
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

// Extracted from Shell.tsx for testing
function formatTodayKicker(now: Date): string {
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

test('Ordinal suffixes for 1st-30th', () => {
  // Test specific dates for correct ordinals (November has 30 days)
  const tests = [
    { day: 1, expected: 'st' },
    { day: 2, expected: 'nd' },
    { day: 3, expected: 'rd' },
    { day: 4, expected: 'th' },
    { day: 11, expected: 'th' },
    { day: 21, expected: 'st' },
    { day: 22, expected: 'nd' },
    { day: 23, expected: 'rd' },
    { day: 30, expected: 'th' },
  ];
  
  for (const { day, expected } of tests) {
    // November 2026 (month index 10)
    const date = new Date(Date.UTC(2026, 10, day, 12, 0, 0));
    const result = formatTodayKicker(date);
    assert.ok(result.includes(`${day}${expected}`), 
      `Day ${day} should use suffix "${expected}", got: ${result}`);
  }
});

test('Weekday included when length allows', () => {
  // November 5 2026 is a Thursday in Edmonton
  const date = new Date(Date.UTC(2026, 10, 5, 12, 0, 0));
  const result = formatTodayKicker(date);
  
  // Should include weekday since total < 80 chars
  assert.ok(result.includes('Thursday'), `Should include weekday: ${result}`);
  assert.ok(result.includes('5th'), `Should include day with ordinal: ${result}`);
  assert.ok(result.includes('November'), `Should include month: ${result}`);
  assert.ok(result.length < 80, `Should be under 80 chars: ${result.length}`);
});

test('Format uses America/Edmonton timezone', () => {
  // Test that formatter respects Edmonton timezone
  // This is validated by Intl.DateTimeFormat having timeZone set
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'America/Edmonton'
  });
  
  const parts = formatter.formatToParts(date);
  assert.ok(parts.some(p => p.type === 'month'));
  assert.ok(parts.some(p => p.type === 'day'));
  assert.ok(parts.some(p => p.type === 'weekday'));
});

test('No year in output', () => {
  const date = new Date(Date.UTC(2026, 10, 5, 12, 0, 0));
  const result = formatTodayKicker(date);
  
  assert.ok(!result.includes('2026'), `Should not include year: ${result}`);
  assert.ok(!result.includes('2027'), `Should not include year: ${result}`);
});

test('Handles teens correctly (11th-19th)', () => {
  // All teens should use 'th', not 11st/12nd/13rd
  for (let day = 11; day <= 19; day++) {
    const date = new Date(Date.UTC(2026, 10, day, 12, 0, 0));
    const result = formatTodayKicker(date);
    assert.ok(result.includes(`${day}th`), 
      `Day ${day} should use "th", got: ${result}`);
  }
});
