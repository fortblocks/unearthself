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
 * Example: "2026-08-23" -> "Sunday August 23rd, 2026"
 */
export function formatMeetingDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T12:00:00"); // Use noon to avoid timezone issues
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    
    const weekday = date.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "America/Edmonton",
    });
    
    const month = date.toLocaleDateString("en-US", {
      month: "long",
      timeZone: "America/Edmonton",
    });
    
    const day = parseInt(
      date.toLocaleDateString("en-US", {
        day: "numeric",
        timeZone: "America/Edmonton",
      })
    );
    
    const year = date.toLocaleDateString("en-US", {
      year: "numeric",
      timeZone: "America/Edmonton",
    });
    
    const ordinal = getOrdinalSuffix(day);
    
    return `${weekday} ${month} ${day}${ordinal}, ${year}`;
  } catch {
    return dateStr;
  }
}
