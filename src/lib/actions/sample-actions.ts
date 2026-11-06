import { createServerFn } from "@tanstack/react-start";
import { failureBundle } from "./view";
import type { ActionsBundle } from "./types";

/** Staff-only labelled fixture. Refused in production so it cannot stand in for Drive. */
export const loadSampleActions = createServerFn({ method: "GET" }).handler(async (): Promise<ActionsBundle> => {
  const { requireStaffSession } = await import("../staff-session");
  await requireStaffSession();
  if (process.env.NODE_ENV === "production") {
    return failureBundle("sample", "Sample actions are not served in production.");
  }
  const { buildFixtureActionsBundle } = await import("./fixture");
  return buildFixtureActionsBundle();
});
