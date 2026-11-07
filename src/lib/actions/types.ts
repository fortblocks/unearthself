import type { ActionCompletion, ActionItem, ExtractionDiagnostic, ExtractionOutcome } from "../action-tracking";

export const ACTION_OWNERS = ["Lisa", "Tess", "Norah", "Christopher"] as const;
export type ActionOwner = (typeof ACTION_OWNERS)[number];
export type ActionFilter = "All" | ActionOwner;
export type SourceMode = "live" | "sample";

export type ActionsBundle = {
  mode: SourceMode;
  outcome: ExtractionOutcome;
  /** Shown when outcome is not a confident empty list. */
  message: string | null;
  actions: ActionItem[];
  completions: ActionCompletion[];
  /** False when the completion store could not be read. */
  completionsKnown: boolean;
  redisConfigured: boolean;
  diagnostic: ExtractionDiagnostic | null;
};

export type ActionsDataSource = {
  id: string;
  mode: SourceMode;
  load: (signal?: AbortSignal) => Promise<ActionsBundle>;
};

export const OPEN_ACTIONS_PAGE_SIZE = 10;
export const TODAY_ACTIONS_LIMIT = 5;
export const ACTIONS_LOAD_TIMEOUT_MS = 20_000;
