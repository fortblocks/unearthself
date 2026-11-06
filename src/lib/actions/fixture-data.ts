import type { Meeting } from "../minutes";

/**
 * Labelled local fixture. The action lines are the same plaintext shape the
 * parser tests use. These are not Drive meetings.
 */
export const FIXTURE_ACTION_TEXT = `
Next steps

☐ [Lisa Hamilton] Email Proposal: Send the updated proposal to the client by Friday EOD.
☐ [Tess, Christopher Mair] Pick Up Passengers: Coordinate pickup schedule for the airport transfers next week.
☐ [Tess Hamilton, Chris] Develop corporate packages: Create three-tier pricing for corporate clients.
☐ [Norah Bird Hamilton] {Perform Moisture Test}: Test moisture levels in the warehouse samples.
☐ [Interlocutor] Review Options: Review the venue options and inform Lisa Hamilton by tomorrow.
☐ [The group] Finalize Budget: Complete the Q4 budget review before month end.

Details

Meeting held at the downtown office.
`;

/** Twelve dates so the per-person limit of 10 and Show more can be exercised. */
export const FIXTURE_DATES = [
  "2026-10-29",
  "2026-10-22",
  "2026-10-15",
  "2026-10-08",
  "2026-10-01",
  "2026-09-24",
  "2026-09-17",
  "2026-09-10",
  "2026-09-03",
  "2026-08-27",
  "2026-08-20",
  "2026-08-13",
] as const;

export function fixtureMeetingId(date: string) {
  return `fixture-${date}`;
}

export function fixtureMeetings(): Meeting[] {
  return FIXTURE_DATES.map((date) => ({
    id: fixtureMeetingId(date),
    title: "Sample fixture — not a Drive meeting",
    date,
    time: "17:00",
    createdTime: `${date}T23:00:00Z`,
    modifiedTime: `${date}T23:00:00Z`,
  }));
}
