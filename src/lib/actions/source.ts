import { extractAllActions, getActionCompletions, isRedisConfigured } from "../action-tracking";
import { devFixtureRequested } from "./dev-fixture";
import { loadSampleActions } from "./sample-actions";
import { ACTIONS_LOAD_TIMEOUT_MS, type ActionsBundle, type ActionsDataSource, type SourceMode } from "./types";
import { isAbortError, loadWithTimeout } from "./timeout";
import { bundleFromExtraction, failureBundle, timeoutBundle } from "./view";

/** Live Drive pipeline. Change this to "sample" only for a labelled fixture. */
export const ACTIONS_SOURCE_MODE: SourceMode = "live";

export async function loadLiveActions(signal?: AbortSignal): Promise<ActionsBundle> {
  try {
    const [extraction, completions, redisConfigured] = await loadWithTimeout(
      () =>
        Promise.all([
          extractAllActions(),
          getActionCompletions().catch(() => null),
          isRedisConfigured().catch(() => false),
        ]),
      ACTIONS_LOAD_TIMEOUT_MS,
      signal,
    );
    return bundleFromExtraction(extraction, completions, redisConfigured, "live");
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof Error && error.name === "ActionsTimeoutError") return timeoutBundle("live");
    console.error("[actions] live load failed:", error);
    return failureBundle("live");
  }
}

export async function loadSampleActionsSource(signal?: AbortSignal): Promise<ActionsBundle> {
  try {
    return await loadWithTimeout(() => loadSampleActions(), ACTIONS_LOAD_TIMEOUT_MS, signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof Error && error.name === "ActionsTimeoutError") return timeoutBundle("sample");
    console.error("[actions] sample load failed:", error);
    return failureBundle("sample");
  }
}

export const liveActionsSource: ActionsDataSource = {
  id: "live",
  mode: "live",
  load: loadLiveActions,
};

export const sampleActionsSource: ActionsDataSource = {
  id: "sample",
  mode: "sample",
  load: loadSampleActionsSource,
};

export function actionsSourceFor(mode: SourceMode): ActionsDataSource {
  return mode === "sample" ? sampleActionsSource : liveActionsSource;
}

export function resolveActionsSource(search: string): ActionsDataSource {
  if (devFixtureRequested(search)) return sampleActionsSource;
  return actionsSourceFor(ACTIONS_SOURCE_MODE);
}
