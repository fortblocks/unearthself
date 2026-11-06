import type { Meeting } from "../../minutes.ts";
import { listMeetings } from "../../minutes.ts";
import { fixtureMeetings } from "../../actions/fixture-data.ts";
import { sectionSources } from "../registry.ts";
import { sectionError } from "../load.ts";
import type { SectionResult, SourceMode } from "../types.ts";

type ListMeetings = () => Promise<Meeting[]>;

/**
 * Recent meetings for Today, and the list behind /admin/minutes.
 * An empty live list is returned as data so the caller can say the read was ambiguous.
 */
export async function fetchMeetingList(
  mode: SourceMode = sectionSources.minutes,
  list: ListMeetings = () => listMeetings(),
): Promise<SectionResult<Meeting[]>> {
  if (mode === "sample") return { ok: true, mode, data: fixtureMeetings() };
  try {
    const meetings = await list();
    return { ok: true, mode: "live", data: meetings };
  } catch (error) {
    return { ok: false, mode: "live", error: sectionError(error, "Meetings could not be loaded.") };
  }
}
