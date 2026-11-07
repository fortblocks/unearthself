import { SEED_SLOTS } from "../../../data/desk.ts";
import { sectionSources } from "../registry.ts";
import { sectionError } from "../load.ts";
import type { SectionResult, SourceMode } from "../types.ts";

export type DiaryRow = {
  id: string;
  time: string;
  name: string;
  guest: string;
  room: string;
  practitioner: string;
  price: number;
};

export function sampleDiary(): DiaryRow[] {
  return SEED_SLOTS.map((slot) => ({
    id: slot.id,
    time: slot.time,
    name: slot.name,
    guest: slot.guest,
    room: slot.room,
    practitioner: slot.practitioner,
    price: slot.price,
  }));
}

const LIVE_ERROR = "The Basecamp diary is not connected. A treatment-book source can replace this later.";

export async function fetchDiary(mode: SourceMode = sectionSources.diary): Promise<SectionResult<DiaryRow[]>> {
  if (mode === "live") return { ok: false, mode, error: LIVE_ERROR };
  try {
    return { ok: true, mode: "sample", data: sampleDiary() };
  } catch (error) {
    return { ok: false, mode: "sample", error: sectionError(error, "Sample diary failed.") };
  }
}
