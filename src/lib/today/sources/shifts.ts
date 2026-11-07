import { SEED_SHIFTS } from "../../../data/desk.ts";
import { sectionSources } from "../registry.ts";
import { sectionError } from "../load.ts";
import type { SectionResult, SourceMode } from "../types.ts";

const PARTNER_FIRST = ["Lisa", "Tess", "Norah", "Christopher"] as const;

export type ShiftRow = {
  id: string;
  name: string;
  role: string;
  hours: string;
};

export function displayShiftName(name: string): string {
  const partner = PARTNER_FIRST.find((first) => name.startsWith(first));
  return partner ?? name;
}

export function sampleShifts(): ShiftRow[] {
  return SEED_SHIFTS.map((shift) => ({
    id: shift.id,
    name: displayShiftName(shift.name),
    role: shift.role,
    hours: shift.hours,
  }));
}

const LIVE_ERROR = "The shift board is not connected. A roster source can replace this later.";

export async function fetchShifts(mode: SourceMode = sectionSources.shifts): Promise<SectionResult<ShiftRow[]>> {
  if (mode === "live") return { ok: false, mode, error: LIVE_ERROR };
  try {
    return { ok: true, mode: "sample", data: sampleShifts() };
  } catch (error) {
    return { ok: false, mode: "sample", error: sectionError(error, "Sample shifts failed.") };
  }
}
