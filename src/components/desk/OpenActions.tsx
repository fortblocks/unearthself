import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Section } from "@/components/desk/Section";
import { SampleBadge } from "@/components/desk/SampleBadge";
import { Button } from "@/components/ui/button";
import { useDesk } from "@/lib/desk-store";
import {
  markActionComplete,
  undoActionComplete,
  type ActionCompletion,
} from "@/lib/action-tracking";
import {
  ACTION_OWNERS,
  OPEN_ACTIONS_PAGE_SIZE,
  TODAY_ACTIONS_LIMIT,
  type ActionFilter,
  type ActionOwner,
  type ActionsBundle,
  type ActionsDataSource,
} from "@/lib/actions/types";
import { isAbortError } from "@/lib/actions/timeout";
import {
  bundleMessage,
  formatCompletedWhen,
  groupOpenActions,
  openListState,
  partnerFromDesk,
  splitByCompletion,
  type OpenListState,
} from "@/lib/actions/view";
import { formatDateOrdinal } from "@/lib/minutes-archive";

type ActionsContextValue = {
  status: "loading" | "ready";
  bundle: ActionsBundle | null;
  completions: ActionCompletion[];
  pendingId: string | null;
  partner: ActionOwner | null;
  markComplete: (actionId: string) => Promise<void>;
  undo: (actionId: string) => Promise<void>;
  retry: () => void;
};

const ActionsContext = createContext<ActionsContextValue | null>(null);

export function useActionsState() {
  return useContext(ActionsContext);
}

export function ActionsProvider({ source, children }: { source: ActionsDataSource; children: ReactNode }) {
  const value = useActionsLoader(source);
  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

function useActionsLoader(source: ActionsDataSource): ActionsContextValue {
  const lookingAs = useDesk((s) => s.lookingAs);
  const partner = partnerFromDesk(lookingAs);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [bundle, setBundle] = useState<ActionsBundle | null>(null);
  const [completions, setCompletions] = useState<ActionCompletion[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    setStatus("loading");
    source.load(ac.signal).then(
      (next) => {
        if (cancelled) return;
        setBundle(next);
        setCompletions(next.completions);
        setStatus("ready");
      },
      (error: unknown) => {
        if (cancelled || isAbortError(error)) return;
        setBundle({
          mode: source.mode,
          outcome: "error",
          message: "Action extraction failed. Open actions cannot be shown as empty.",
          actions: [],
          completions: [],
          completionsKnown: false,
          redisConfigured: false,
          diagnostic: null,
        });
        setCompletions([]);
        setStatus("ready");
      },
    );
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [source, reloadKey]);

  const markComplete = async (actionId: string) => {
    if (!bundle?.redisConfigured || !partner) return;
    setPendingId(actionId);
    try {
      const result = await markActionComplete({ data: { actionId, completedBy: partner } });
      if (result.ok) {
        setCompletions((prev) => [
          ...prev.filter((row) => row.actionId !== actionId),
          { actionId, completedBy: partner, completedAt: new Date().toISOString() },
        ]);
      }
    } catch (error) {
      console.error("Failed to mark action complete:", error);
    } finally {
      setPendingId(null);
    }
  };

  const undo = async (actionId: string) => {
    if (!bundle?.redisConfigured || !partner) return;
    setPendingId(actionId);
    try {
      const result = await undoActionComplete({ data: { actionId, completedBy: partner } });
      if (result.ok) {
        setCompletions((prev) => prev.map((row) => (row.actionId === actionId ? { ...row, undone: true } : row)));
      }
    } catch (error) {
      console.error("Failed to undo action:", error);
    } finally {
      setPendingId(null);
    }
  };

  return {
    status,
    bundle,
    completions,
    pendingId,
    partner,
    markComplete,
    undo,
    retry: () => setReloadKey((key) => key + 1),
  };
}

export function OpenActionsPanel({
  variant = "board",
  owner,
  kicker = "Open actions",
}: {
  variant?: "board" | "mine";
  owner?: ActionOwner | null;
  kicker?: string;
}) {
  const state = useActionsState();
  const [filter, setFilter] = useState<ActionFilter>("All");
  const [shownByOwner, setShownByOwner] = useState<Partial<Record<ActionOwner, number>>>({});
  const pageSize = variant === "mine" ? TODAY_ACTIONS_LIMIT : OPEN_ACTIONS_PAGE_SIZE;
  const activeFilter: ActionFilter = variant === "mine" && owner ? owner : filter;

  if (!state) return null;

  const badge = state.bundle?.mode === "sample" ? <SampleBadge /> : null;
  const headerAction = (
    <span className="flex items-center gap-3">
      {badge}
      {variant === "mine" ? (
        <Link to="/admin/minutes" className="text-sm font-semibold text-ember">
          All actions
        </Link>
      ) : null}
    </span>
  );

  if (state.status === "loading" || !state.bundle) {
    return (
      <Section kicker={kicker} action={headerAction}>
        <div className="border border-line bg-paper p-8 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-sandstone" />
          <p className="mt-3 text-sm text-muted">Loading actions…</p>
        </div>
      </Section>
    );
  }

  const bundle = state.bundle;
  const { open, completed } = splitByCompletion(bundle.actions, state.completions);
  const groups = groupOpenActions(open, activeFilter, shownByOwner, pageSize).filter((group) => group.total > 0);
  const openCount = activeFilter === "All" ? open.length : open.filter((action) => action.owner === activeFilter).length;
  const listState: OpenListState = openListState({
    outcome: bundle.outcome,
    actionCount: bundle.actions.length,
    openCount,
    completionsKnown: bundle.completionsKnown,
  });
  const message = bundleMessage(bundle);
  const showFilters = variant === "board";
  const showCompleted = variant === "board";

  return (
    <Section kicker={kicker} action={headerAction}>
      <div className="space-y-6">
        {showFilters ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter open actions">
            {(["All", ...ACTION_OWNERS] as ActionFilter[]).map((name) => (
              <Button
                key={name}
                type="button"
                variant={filter === name ? "coal" : "outline"}
                aria-pressed={filter === name}
                onClick={() => setFilter(name)}
                className="min-h-11 px-3"
              >
                {name}
              </Button>
            ))}
          </div>
        ) : null}

        {message && listState !== "empty" ? (
          <div className="border-l-2 border-ember bg-ember/5 px-4 py-3" role="status">
            <p className="text-sm text-coal">{message}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={state.retry}>
              Try again
            </Button>
          </div>
        ) : null}

        {listState === "empty" ? (
          <div className="border border-line bg-paper p-8 text-center">
            <p className="text-muted">
              No open actions.
              {variant === "mine" ? (
                <>
                  {" "}
                  <Link to="/admin/minutes" className="text-ember hover:underline">
                    All minutes
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        {listState === "list" ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.owner}>
                {variant === "board" ? <p className="mb-3 text-sm font-semibold text-coal">{group.owner}</p> : null}
                <ul className="divide-y divide-line border-y border-line">
                    {group.visible.map((action) => (
                      <li key={action.id} className="flex items-start justify-between gap-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{action.text}</p>
                          <p className="mt-1 text-sm text-muted">
                            <Link
                              to="/admin/minutes/$meetingId"
                              params={{ meetingId: action.meetingId }}
                              className="hover:underline"
                            >
                              {formatDateOrdinal(action.meetingDate)} · {action.meetingTitle}
                            </Link>
                          </p>
                          {action.excerpt ? (
                            <p className="mt-1 border-l-2 border-line pl-2 text-xs text-sandstone">{action.excerpt}</p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!bundle.redisConfigured || state.pendingId === action.id || !state.partner}
                          onClick={() => void state.markComplete(action.id)}
                          className="px-3 py-1 text-sm"
                        >
                          <Circle className="size-3" />
                          {state.pendingId === action.id ? "…" : "Mark complete"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                {variant === "board" && group.remaining > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2"
                    onClick={() =>
                      setShownByOwner((prev) => ({
                        ...prev,
                        [group.owner]: (prev[group.owner] ?? pageSize) + pageSize,
                      }))
                    }
                  >
                    Show more
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {showCompleted && (bundle.outcome === "ok" || bundle.actions.length > 0 || !bundle.completionsKnown) ? (
          <details className="border border-line bg-paper">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              {bundle.completionsKnown
                ? `Completed actions (${completed.length})`
                : "Completed actions — could not be loaded"}
            </summary>
            {bundle.completionsKnown && completed.length > 0 ? (
              <ul className="divide-y divide-line border-t border-line">
                {completed.map(({ action, completion }) => (
                  <li key={action.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal" />
                      <div>
                        <p className="font-semibold text-muted line-through">{action.text}</p>
                        <p className="mt-1 text-sm text-muted">
                          <Link
                            to="/admin/minutes/$meetingId"
                            params={{ meetingId: action.meetingId }}
                            className="hover:underline"
                          >
                            {formatDateOrdinal(action.meetingDate)} · {action.meetingTitle}
                          </Link>
                        </p>
                        <p className="mt-1 text-xs text-sandstone">
                          Completed by {completion.completedBy} on {formatCompletedWhen(completion.completedAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!bundle.redisConfigured || state.pendingId === action.id || !state.partner}
                      onClick={() => void state.undo(action.id)}
                      className="px-3 py-1 text-sm"
                    >
                      {state.pendingId === action.id ? "…" : "Undo"}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-line px-4 py-3 text-sm text-muted">
                {bundle.completionsKnown
                  ? "No completed actions."
                  : "Completion records were not read, so this list is unknown."}
              </p>
            )}
          </details>
        ) : null}

        {!bundle.redisConfigured && listState === "list" ? (
          <p className="text-xs text-muted">Mark complete is off until the completion store is configured.</p>
        ) : null}
      </div>
    </Section>
  );
}

export function ActionsDiagnostic({ owner }: { owner: ActionOwner | null }) {
  const state = useActionsState();
  if (!state) return null;
  const bundle = state.bundle;
  const diagnostic = bundle?.diagnostic;
  const { open } = bundle ? splitByCompletion(bundle.actions, state.completions) : { open: [] };
  const mine = owner ? open.filter((action) => action.owner === owner) : [];
  const countsKnown = Boolean(bundle && (bundle.outcome === "ok" || bundle.actions.length > 0));

  const count = (name: ActionOwner) => {
    if (!bundle || state.status !== "ready") return "…";
    if (!countsKnown) return "unknown";
    return String(bundle.actions.filter((action) => action.owner === name).length);
  };

  return (
    <details className="mt-10 border border-line bg-paper p-4 text-xs font-mono">
      <summary className="cursor-pointer font-semibold text-coal">Diagnostic Info</summary>
      <div className="mt-4 space-y-2">
        <div className="border-b border-line pb-2">
          <p className="font-semibold">Discovery & Extraction</p>
          {state.status !== "ready" || !bundle ? (
            <p>Extraction has not finished. Counts below are not a result.</p>
          ) : (
            <>
              <p>Source: {bundle.mode}</p>
              <p>Outcome: {bundle.outcome}</p>
              <p>
                Cache hit: {diagnostic ? (diagnostic.cacheHit ? "YES" : "NO") : "n/a"}{" "}
                {diagnostic?.durationMs ? `(${diagnostic.durationMs}ms)` : ""}
              </p>
              <p>
                Discovered meetings:{" "}
                {bundle.outcome === "unknown"
                  ? "unknown"
                  : diagnostic
                    ? String(diagnostic.meetingsProcessed)
                    : "unknown"}
              </p>
              <p>
                Export failures:{" "}
                {diagnostic?.meetingsFailed === undefined ? "n/a" : String(diagnostic.meetingsFailed)}
              </p>
              <p>Latest meeting date: {diagnostic?.latestMeetingDate || "none"}</p>
              <p>Total extracted actions: {countsKnown ? String(bundle.actions.length) : "unknown"}</p>
            </>
          )}
        </div>
        <div className="border-b border-line pb-2">
          <p className="font-semibold">Partner Counts (All Actions)</p>
          {ACTION_OWNERS.map((name) => (
            <p key={name}>
              {name}: {count(name)}
            </p>
          ))}
        </div>
        <div className="border-b border-line pb-2">
          <p className="font-semibold">Filtering Stages ({owner ?? "unknown"})</p>
          <p>Open for partner: {countsKnown && owner ? String(mine.length) : "unknown"}</p>
          <p>Shown on Today: {countsKnown && owner ? String(Math.min(mine.length, TODAY_ACTIONS_LIMIT)) : "unknown"}</p>
          <p>Date filter: none (most recent open actions)</p>
        </div>
        {diagnostic && diagnostic.errors.length > 0 ? (
          <div className="text-red-600">
            <p className="font-semibold">Errors</p>
            {diagnostic.errors.map((err, i) => (
              <p key={`${err.stage}-${err.code}-${i}`}>
                {err.stage}: {err.code}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}
