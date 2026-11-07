import { SEED_STAYS, SUITES, TODAY } from "../../../data/desk.ts";
import { sectionSources } from "../registry.ts";
import { sectionError } from "../load.ts";
import type { SectionResult, SourceMode } from "../types.ts";

export type ArrivalState = "in" | "out" | "open";

export type ArrivalRow = {
  suite: string;
  line: string;
  state: ArrivalState;
};

/** Sample book date. Not the live Edmonton date shown in the page header. */
export const SAMPLE_BOOK_DATE = TODAY;

export function sampleArrivals(bookDate = SAMPLE_BOOK_DATE): ArrivalRow[] {
  const occupied = (checkIn: string, checkOut: string) => checkIn <= bookDate && checkOut > bookDate;
  return SUITES.map((suite) => {
    const stay = SEED_STAYS.find((row) => row.suite === suite.slug && occupied(row.checkIn, row.checkOut));
    const leaving = SEED_STAYS.find((row) => row.suite === suite.slug && row.checkOut === bookDate);
    const incoming = SEED_STAYS.find((row) => row.suite === suite.slug && row.checkIn === bookDate);
    if (stay) return { suite: suite.name, line: stay.guest, state: "in" };
    if (leaving) return { suite: suite.name, line: `Out this morning · ${leaving.guest}`, state: "out" };
    if (incoming) return { suite: suite.name, line: `Due in · ${incoming.guest}`, state: "open" };
    return { suite: suite.name, line: "Empty", state: "open" };
  });
}

const LIVE_ERROR = "Arrivals are not connected. A Roombox source can replace this later.";

export async function fetchArrivals(mode: SourceMode = sectionSources.arrivals): Promise<SectionResult<ArrivalRow[]>> {
  if (mode === "live") return { ok: false, mode, error: LIVE_ERROR };
  try {
    return { ok: true, mode: "sample", data: sampleArrivals() };
  } catch (error) {
    return { ok: false, mode: "sample", error: sectionError(error, "Sample arrivals failed.") };
  }
}
