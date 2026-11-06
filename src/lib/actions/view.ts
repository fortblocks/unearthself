import { getOrdinalSuffix } from "../date-format.ts";
import type { ActionCompletion, ActionItem, ExtractionOutcome, ExtractionResult } from "../action-tracking.ts";
import {
  ACTION_OWNERS,
  OPEN_ACTIONS_PAGE_SIZE,
  type ActionFilter,
  type ActionOwner,
  type ActionsBundle,
  type SourceMode,
} from "./types.ts";

export type OwnerGroup = {
  owner: ActionOwner;
  visible: ActionItem[];
  remaining: number;
  total: number;
};

export type CompletedRow = {
  action: ActionItem;
  completion: ActionCompletion;
};

const TIMEOUT_MESSAGE =
  "Action extraction timed out. This is not the same as there being no actions.";
const UNKNOWN_MESSAGE =
  "Action extraction is unknown. No meetings were discovered, which can mean the folder is empty or Drive could not be read. This is not a list of zero actions.";
const ERROR_MESSAGE =
  "Action extraction failed. Open actions cannot be shown as empty.";
const PARTIAL_MESSAGE =
  "Extraction was incomplete. The actions below are only what could be read.";
const COMPLETIONS_MESSAGE =
  "Completion status could not be read. Items already finished may still appear as open.";

export function sortByMeetingDateDesc(actions: ActionItem[]): ActionItem[] {
  return [...actions].sort((a, b) => {
    const byDate = b.meetingDate.localeCompare(a.meetingDate);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });
}

export function splitByCompletion(actions: ActionItem[], completions: ActionCompletion[]) {
  const done = new Map<string, ActionCompletion>();
  for (const completion of completions) {
    if (!completion.undone) done.set(completion.actionId, completion);
  }
  const open: ActionItem[] = [];
  const completed: CompletedRow[] = [];
  for (const action of actions) {
    const completion = done.get(action.id);
    if (completion) completed.push({ action, completion });
    else open.push(action);
  }
  completed.sort((a, b) => b.action.meetingDate.localeCompare(a.action.meetingDate) || b.action.id.localeCompare(a.action.id));
  return { open, completed };
}

export function groupOpenActions(
  open: ActionItem[],
  filter: ActionFilter,
  shownByOwner: Partial<Record<ActionOwner, number>>,
  pageSize = OPEN_ACTIONS_PAGE_SIZE,
): OwnerGroup[] {
  const sorted = sortByMeetingDateDesc(open);
  const owners: readonly ActionOwner[] = filter === "All" ? ACTION_OWNERS : [filter];
  return owners.map((owner) => {
    const mine = sorted.filter((action) => action.owner === owner);
    const limit = shownByOwner[owner] ?? pageSize;
    return {
      owner,
      visible: mine.slice(0, limit),
      remaining: Math.max(0, mine.length - limit),
      total: mine.length,
    };
  });
}

export type OpenListState = "loading" | "unknown" | "error" | "empty" | "list";

/**
 * "empty" is the only state allowed to say there are no open actions.
 * Unknown, failed, and timed-out extracts never take that path.
 */
export function openListState(args: {
  outcome: ExtractionOutcome;
  actionCount: number;
  openCount: number;
  completionsKnown: boolean;
}): OpenListState {
  if (args.outcome === "unknown") return "unknown";
  if (args.outcome === "error" && args.actionCount === 0) return "error";
  if (!args.completionsKnown && args.actionCount === 0) return "error";
  if (args.openCount === 0) return "empty";
  return "list";
}

export function bundleMessage(bundle: Pick<ActionsBundle, "outcome" | "actions" | "completionsKnown" | "message">): string | null {
  if (bundle.message) return bundle.message;
  if (bundle.outcome === "unknown") return UNKNOWN_MESSAGE;
  if (bundle.outcome === "error" && bundle.actions.length === 0) return ERROR_MESSAGE;
  if (bundle.outcome === "error") return PARTIAL_MESSAGE;
  if (!bundle.completionsKnown) return COMPLETIONS_MESSAGE;
  return null;
}

export function resolveOutcome(result: ExtractionResult): ExtractionOutcome {
  if (result.outcome) return result.outcome;
  const substantive = result.diagnostic.errors.filter((e) => e.stage !== "cache-read" && e.stage !== "cache-write");
  if (substantive.some((e) => e.stage === "discovery" || e.stage === "extraction")) return "error";
  if (result.diagnostic.meetingsProcessed === 0 && result.actions.length === 0) return "unknown";
  if (substantive.length > 0 && result.actions.length === 0) return "error";
  if ((result.diagnostic.meetingsFailed ?? 0) > 0 && result.actions.length === 0) return "error";
  return "ok";
}

export function bundleFromExtraction(
  extraction: ExtractionResult,
  completions: ActionCompletion[] | null,
  redisConfigured: boolean,
  mode: SourceMode,
): ActionsBundle {
  const outcome = resolveOutcome(extraction);
  const bundle: ActionsBundle = {
    mode,
    outcome,
    message: null,
    actions: extraction.actions,
    completions: completions ?? [],
    completionsKnown: completions !== null,
    redisConfigured,
    diagnostic: extraction.diagnostic,
  };
  bundle.message = bundleMessage(bundle);
  return bundle;
}

export function timeoutBundle(mode: SourceMode): ActionsBundle {
  return {
    mode,
    outcome: "error",
    message: TIMEOUT_MESSAGE,
    actions: [],
    completions: [],
    completionsKnown: false,
    redisConfigured: false,
    diagnostic: null,
  };
}

export function failureBundle(mode: SourceMode, message = ERROR_MESSAGE): ActionsBundle {
  return {
    mode,
    outcome: "error",
    message,
    actions: [],
    completions: [],
    completionsKnown: false,
    redisConfigured: false,
    diagnostic: null,
  };
}

export function formatCompletedWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const day = Number(pick("day"));
  const month = pick("month");
  const year = Number(pick("year"));
  const hour = pick("hour");
  const minute = pick("minute");
  const dayPeriod = pick("dayPeriod").toLowerCase();
  const nowYear = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Edmonton", year: "numeric" }).format(now),
  );
  const yearBit = year !== nowYear ? ` ${year}` : "";
  return `${day}${getOrdinalSuffix(day)} ${month}${yearBit}, ${hour}:${minute} ${dayPeriod}`;
}

export function partnerFromDesk(id: string): ActionOwner | null {
  const match = ACTION_OWNERS.find((name) => name.toLowerCase() === id.toLowerCase());
  return match ?? null;
}

export function countForOwner(actions: ActionItem[], owner: ActionOwner): number | "unknown" {
  return actions.filter((action) => action.owner === owner).length;
}
