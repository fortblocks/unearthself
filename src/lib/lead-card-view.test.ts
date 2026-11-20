import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { emptyCoco, LeadCardActions } from "./lead-card-view.ts";
import type { CocoJoin, CocoStage } from "./hunter-outreach.ts";

const stages: CocoJoin[] = [
  emptyCoco({ stage: "new", stageLabel: "Unreviewed", canApproveDraft: true }),
  emptyCoco({ stage: "approved", stageLabel: "Approved", canApproveDraft: true }),
  emptyCoco({ stage: "queued", stageLabel: "Queued", status: "Approved, waiting for Coco.", touch: 1 }),
  emptyCoco({ stage: "drafting", stageLabel: "Drafting", status: "Coco is writing the draft.", touch: 1 }),
  emptyCoco({
    stage: "draft-ready",
    stageLabel: "Draft ready",
    status: "Read the draft, then approve the wording.",
    touch: 1,
    subject: "A note",
    body: "Hello from Drumheller.",
    canApproveWording: true,
  }),
  emptyCoco({
    stage: "wording-approved",
    stageLabel: "Wording approved",
    status: "Waiting for your Send in Coco's chat.",
    touch: 1,
    subject: "A note",
    body: "Hello from Drumheller.",
    canWithdraw: true,
  }),
  emptyCoco({ stage: "sent", stageLabel: "Sent, 1 of 3", status: "Sent, 1 of 3." }),
  emptyCoco({ stage: "replied", stageLabel: "Replied" }),
  emptyCoco({ stage: "booked", stageLabel: "Booked" }),
  emptyCoco({ stage: "won", stageLabel: "Won" }),
  emptyCoco({ stage: "closed", stageLabel: "Lost" }),
  emptyCoco({ stage: "draft-skipped", stageLabel: "Draft skipped: No retreat fit", skipNote: "No retreat fit", status: "Coco skipped this draft. No retreat fit" }),
];

function controlLabels(html: string) {
  return [...html.matchAll(/<(button|a|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) =>
    match[2]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ?? "",
  );
}

test("the card page has no Send control and no mail link in any stage", () => {
  const seen = new Set<CocoStage>();
  for (const coco of stages) {
    seen.add(coco.stage);
    const html = renderToStaticMarkup(
      createElement(LeadCardActions, {
        cardId: "card-1",
        coco,
        subject: coco.subject,
        body: coco.body,
        menusOpen: true,
        openMenu: coco.stage === "new" ? "skip" : coco.stage === "sent" ? "stop" : null,
      }),
    );
    assert.equal(html.includes("mailto:"), false, coco.stage);
    const allowed = html.includes("Waiting for your Send in Coco") ? "Waiting for your Send in Coco" : "";
    const labels = controlLabels(html);
    for (const label of labels) {
      assert.equal(/send/i.test(label), false, `${coco.stage}: ${label}`);
    }
    if (coco.stage === "wording-approved") assert.equal(allowed.length > 0, true);
    if (coco.stage === "new") assert.equal(labels.includes("Wrong size"), true);
    if (coco.stage === "sent") assert.equal(labels.includes("This person"), true);
    if (coco.stage === "sent") assert.equal(labels.includes("The whole company"), true);
    if (coco.stage === "draft-ready") assert.equal(labels.includes("Approve wording"), true);
    if (coco.stage === "wording-approved") assert.equal(labels.includes("Withdraw wording approval"), true);
    assert.equal(labels.includes("Approve and draft") || coco.stage !== "new", true);
  }
  assert.equal(seen.has("draft-ready"), true);
  assert.equal(seen.has("wording-approved"), true);
});
