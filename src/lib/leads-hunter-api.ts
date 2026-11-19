import { createServerFn } from "@tanstack/react-start";
import { appendDoNotContact, readHunterDesk, writeHunterPaused } from "@/lib/leads-hunter";
import type { DncReason } from "@/lib/hunter-phase";
import { requireStaffSession } from "@/lib/staff-session";

export const getHunterDesk = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaffSession();
  return readHunterDesk();
});

export const setHunterPaused = createServerFn({ method: "POST" })
  .validator((data: { paused: boolean }) => data)
  .handler(async ({ data }) => {
    await requireStaffSession();
    return writeHunterPaused(data.paused === true);
  });

const DNC_REASONS = new Set<DncReason>(["unsubscribe", "dont-contact", "lost", "skipped"]);

export const addDoNotContact = createServerFn({ method: "POST" })
  .validator((data: { domain: string; email?: string; reason: DncReason; today: string }) => data)
  .handler(async ({ data }) => {
    await requireStaffSession();
    if (!DNC_REASONS.has(data.reason)) throw new Error("Unknown do-not-contact reason");
    await appendDoNotContact({
      domain: data.domain,
      email: data.email ?? "",
      reason: data.reason,
      today: data.today,
    });
    return { ok: true as const };
  });
