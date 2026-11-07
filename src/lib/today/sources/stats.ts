import { SEED_LEADS, SEED_RISK } from "../../../data/desk.ts";
import { cad } from "../../format.ts";
import { sampleArrivals } from "./arrivals.ts";
import { sampleDiary } from "./diary.ts";
import { sectionSources } from "../registry.ts";
import { sectionError } from "../load.ts";
import type { SectionResult, SourceMode } from "../types.ts";

export type TodayStats = {
  inHouse: string;
  inHouseHint: string;
  treatments: string;
  treatmentsHint: string;
  pipeline: string;
  pipelineHint: string;
  risk: string;
  riskHint: string;
};

export function sampleStats(): TodayStats {
  const inHouse = sampleArrivals().filter((row) => row.state === "in").length;
  const treatments = sampleDiary().length;
  const open = SEED_LEADS.filter((lead) => lead.status !== "lost" && lead.status !== "won");
  const weighted = open.reduce((sum, lead) => sum + lead.value * lead.weight, 0);
  const risk = SEED_RISK.filter((row) => row.open).length;
  return {
    inHouse: `${inHouse} / 4`,
    inHouseHint: "Haven keys tonight",
    treatments: String(treatments),
    treatmentsHint: "Basecamp diary today",
    pipeline: String(open.length),
    pipelineHint: `${cad(weighted)} weighted`,
    risk: String(risk),
    riskHint: "Waivers, weather, cover",
  };
}

const LIVE_ERROR = "Stats are not connected. They can be derived from live section sources later.";

export async function fetchStats(mode: SourceMode = sectionSources.stats): Promise<SectionResult<TodayStats>> {
  if (mode === "live") return { ok: false, mode, error: LIVE_ERROR };
  try {
    return { ok: true, mode: "sample", data: sampleStats() };
  } catch (error) {
    return { ok: false, mode: "sample", error: sectionError(error, "Sample stats failed.") };
  }
}
