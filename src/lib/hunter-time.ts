/**
 * America/Edmonton clock. Working hours and the 4am sweep use this zone,
 * so a daylight-saving change does not move them.
 */

import { hunterWorkHours } from "./hunter-config.ts";

export type EdmontonClock = {
  date: string;
  hour: number;
  minute: number;
};

export function edmontonClock(now = new Date()): EdmontonClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const bag = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${bag.year}-${bag.month}-${bag.day}`,
    hour: Number(bag.hour),
    minute: Number(bag.minute),
  };
}

/** A clock time a person can read. Example: 2026-11-19 16:14 America/Edmonton. */
export function edmontonWhen(now = new Date()) {
  const clock = edmontonClock(now);
  const hour = String(clock.hour).padStart(2, "0");
  const minute = String(clock.minute).padStart(2, "0");
  return `${clock.date} ${hour}:${minute} America/Edmonton`;
}

/** Start inclusive, end exclusive. Default 7:00 to 19:00, every day. */
export function withinWorkingHours(now = new Date(), start?: number, end?: number) {
  const hours = start == null || end == null ? hunterWorkHours() : { start, end };
  const clock = edmontonClock(now);
  return clock.hour >= hours.start && clock.hour < hours.end;
}

export function isEdmontonHour(now: Date, hour: number) {
  return edmontonClock(now).hour === hour;
}

/** Null when the sweep should run. The two UTC cron hours both call this, and only 4am Edmonton proceeds. */
export function nightlySkip(now: Date, lastSweptOn: string): "not-4am" | "already-swept" | null {
  const clock = edmontonClock(now);
  if (clock.hour !== 4) return "not-4am";
  if (lastSweptOn === clock.date) return "already-swept";
  return null;
}

/** True only at 4am Edmonton, and only once per Edmonton date. */
export function nightlyDue(now: Date, lastSweptOn: string) {
  return nightlySkip(now, lastSweptOn) == null;
}
