import { extractExplicitActions, type ActionCompletion } from "../action-tracking.ts";
import type { ActionsBundle } from "./types.ts";
import { FIXTURE_ACTION_TEXT, FIXTURE_DATES, fixtureMeetingId } from "./fixture-data.ts";

/**
 * Runs the production action parser over the labelled fixture.
 * Not a live Drive extract.
 */
export async function buildFixtureActionsBundle(): Promise<ActionsBundle> {
  const seed = await extractExplicitActions(
    "fixture-seed",
    FIXTURE_DATES[0],
    "Sample fixture — not a Drive meeting",
    FIXTURE_ACTION_TEXT,
  );
  const actions = FIXTURE_DATES.flatMap((date) =>
    seed.map((action) => ({
      ...action,
      id: `${fixtureMeetingId(date)}:${action.id.slice("fixture-seed:".length)}`,
      meetingId: fixtureMeetingId(date),
      meetingDate: date,
    })),
  );

  const lisa = actions.filter((action) => action.owner === "Lisa");
  const oldestLisa = lisa[lisa.length - 1];
  const completions: ActionCompletion[] = oldestLisa
    ? [
        {
          actionId: oldestLisa.id,
          completedBy: "Tess",
          completedAt: "2026-10-02T18:30:00Z",
        },
      ]
    : [];

  return {
    mode: "sample",
    outcome: "ok",
    message: null,
    actions,
    completions,
    completionsKnown: true,
    redisConfigured: false,
    diagnostic: {
      cacheHit: false,
      meetingsProcessed: FIXTURE_DATES.length,
      meetingsFailed: 0,
      latestMeetingDate: FIXTURE_DATES[0],
      errors: [],
    },
  };
}
