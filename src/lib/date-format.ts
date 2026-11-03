/**
 * Date formatting utilities for Minutes
 */

/**
 * Get ordinal suffix for a day (1st, 2nd, 3rd, 4th, etc.)
 */
export function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return "th";
  }
  
  const lastDigit = day % 10;
  switch (lastDigit) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Format a date string (YYYY-MM-DD) to full written format in America/Edmonton timezone
 * Example: "2026-08-23" -> "Tuesday August 23rd, 2026"
 * 
 * IMPORTANT: Uses the date AS-IS from the filename, in Edmonton timezone.
 * The date "2026-08-25" in a filename means August 25th in Edmonton, regardless of UTC offset.
 */
export function formatMeetingDate(dateStr: string): string {
  try {
    // Parse YYYY-MM-DD format
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return dateStr;
    }
    
    const [_, yearStr, monthStr, dayStr] = match;
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    
    // Validate date parts
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return dateStr;
    }
    
    // Create date at noon in Edmonton timezone to avoid day shifts
    // This ensures the date stays the same regardless of UTC offset
    const date = new Date(`${yearStr}-${monthStr}-${dayStr}T12:00:00-06:00`); // MDT/MST is UTC-6 or UTC-7
    
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    
    const weekday = date.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "America/Edmonton",
    });
    
    const monthName = date.toLocaleDateString("en-US", {
      month: "long",
      timeZone: "America/Edmonton",
    });
    
    const ordinal = getOrdinalSuffix(day);
    
    return `${weekday} ${monthName} ${day}${ordinal}, ${year}`;
  } catch {
    return dateStr;
  }
}
