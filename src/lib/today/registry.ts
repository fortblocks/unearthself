import type { SourceMode } from "./types.ts";

/**
 * One switch per section. Sample stays labelled in the UI.
 * Flip a key to "live" when that integration exists; the section component does not change.
 */
export const sectionSources = {
  arrivals: "sample",
  diary: "sample",
  shifts: "sample",
  programme: "sample",
  leads: "sample",
  needsHuman: "sample",
  stats: "sample",
  minutes: "live",
  actions: "live",
} as const satisfies Record<string, SourceMode>;

export type TodaySectionId = keyof typeof sectionSources;
