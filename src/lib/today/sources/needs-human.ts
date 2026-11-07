import { SEED_RISK } from "../../../data/desk.ts";
import { sectionSources } from "../registry.ts";
import { sectionError } from "../load.ts";
import type { SectionResult, SourceMode } from "../types.ts";

export type NeedsHumanRow = {
  id: string;
  kind: string;
  level: "watch" | "block";
  title: string;
  detail: string;
  owner: "Lisa" | "Tess" | "Norah" | "Christopher";
};

const OWNER = {
  lisa: "Lisa",
  tess: "Tess",
  norah: "Norah",
  christopher: "Christopher",
} as const;

export function sampleNeedsHuman(): NeedsHumanRow[] {
  return SEED_RISK.filter((row) => row.open).map((row) => ({
    id: row.id,
    kind: row.kind,
    level: row.level,
    title: row.title,
    detail: row.detail,
    owner: OWNER[row.owner],
  }));
}

const LIVE_ERROR = "Needs a human is not connected. A risk source can replace this later.";

export async function fetchNeedsHuman(
  mode: SourceMode = sectionSources.needsHuman,
): Promise<SectionResult<NeedsHumanRow[]>> {
  if (mode === "live") return { ok: false, mode, error: LIVE_ERROR };
  try {
    return { ok: true, mode: "sample", data: sampleNeedsHuman() };
  } catch (error) {
    return { ok: false, mode: "sample", error: sectionError(error, "Sample risk rows failed.") };
  }
}
