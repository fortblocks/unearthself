import { APEX_ROS } from "../../../data/desk.ts";
import { sectionSources } from "../registry.ts";
import { sectionError } from "../load.ts";
import type { SectionResult, SourceMode } from "../types.ts";

export type ProgrammeBlock = { time: string; item: string; owner: string };
export type ProgrammeDay = { date: string; label: string; blocks: ProgrammeBlock[] };
export type Programme = { title: string; note: string; days: ProgrammeDay[] };

export function sampleProgramme(): Programme {
  return {
    title: APEX_ROS.title,
    note: "Draft. Outdoor stays off the card until D13.",
    days: APEX_ROS.days.map((day) => ({
      date: day.date,
      label: day.label,
      blocks: day.blocks.map((block) => ({ time: block.time, item: block.item, owner: block.owner })),
    })),
  };
}

const LIVE_ERROR = "The next programme is not connected. A programme source can replace this later.";

export async function fetchProgramme(mode: SourceMode = sectionSources.programme): Promise<SectionResult<Programme>> {
  if (mode === "live") return { ok: false, mode, error: LIVE_ERROR };
  try {
    return { ok: true, mode: "sample", data: sampleProgramme() };
  } catch (error) {
    return { ok: false, mode: "sample", error: sectionError(error, "Sample programme failed.") };
  }
}
