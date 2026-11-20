import { createServerFn } from "@tanstack/react-start";
import { appendDoNotContact, readHunterDesk, writeHunterPaused } from "@/lib/leads-hunter";
import {
  approveAndQueueForCoco as queueForCoco,
  approveWording as approveCardWording,
  readCocoCard,
  saveCocoDraftEdit as saveDraftEdit,
  withdrawWording as withdrawCardWording,
} from "@/lib/hunter-outreach";
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

export const approveAndQueueForCoco = createServerFn({ method: "POST" })
  .validator((data: { cardId: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireStaffSession();
    return queueForCoco({ cardId: data.cardId, queuedBy: session.email });
  });

export const saveCocoDraftEdit = createServerFn({ method: "POST" })
  .validator((data: { cardId: string; touch: number; subject: string; body: string }) => data)
  .handler(async ({ data }) => {
    await requireStaffSession();
    return saveDraftEdit(data);
  });

export const approveWording = createServerFn({ method: "POST" })
  .validator((data: { cardId: string; subject: string; body: string }) => data)
  .handler(async ({ data }) => {
    await requireStaffSession();
    return approveCardWording(data);
  });

export const withdrawWording = createServerFn({ method: "POST" })
  .validator((data: { cardId: string }) => data)
  .handler(async ({ data }) => {
    await requireStaffSession();
    return withdrawCardWording(data);
  });

export const getCocoCard = createServerFn({ method: "POST" })
  .validator((data: { cardId: string }) => data)
  .handler(async ({ data }) => {
    await requireStaffSession();
    return readCocoCard(data.cardId);
  });
