import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { cocoAwaitingDraft, COCO_DRAFT_POLL_MS, COCO_DRAFT_WAIT_MS, draftPollDecision, emptyCoco, LeadCardActions } from "./lead-card-view.ts";
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
    if (coco.stage === "queued" || coco.stage === "drafting") {
      assert.equal(html.includes("Coco drafting"), true);
      assert.equal(html.includes("This usually takes a few minutes. You can leave this page."), true);
      assert.equal(html.includes('data-draft-wait="writing"'), true);
      assert.equal(html.includes('id="card-1-subject"'), false);
    }
    if (coco.stage === "draft-ready") {
      assert.equal(html.includes("Coco drafting"), false);
      assert.equal(html.includes('id="card-1-subject"'), true);
    }
    if (coco.stage === "draft-ready") assert.equal(labels.includes("Approve wording"), true);
    if (coco.stage === "wording-approved") assert.equal(labels.includes("Withdraw wording approval"), true);
    assert.equal(labels.includes("Approve and draft") || coco.stage !== "new", true);
  }
  assert.equal(seen.has("draft-ready"), true);
  assert.equal(seen.has("wording-approved"), true);
});

test("a queued or drafting card shows Coco writing, then the same editor when the draft arrives", () => {
  const waiting = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "card-1",
      coco: emptyCoco({ stage: "queued", stageLabel: "Queued", status: "Approved, waiting for Coco.", touch: 1 }),
      subject: "",
      body: "",
    }),
  );
  assert.equal(waiting.includes("Coco drafting"), true);
  assert.equal(waiting.includes("animate-spin"), true);
  assert.equal(waiting.includes("\u2014"), false);
  assert.equal(waiting.includes('id="card-1-subject"'), false);

  const late = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "card-1",
      coco: emptyCoco({ stage: "drafting", stageLabel: "Drafting", touch: 1 }),
      subject: "",
      body: "",
      draftWait: "late",
    }),
  );
  assert.equal(late.includes("The draft has not arrived yet."), true);
  assert.equal(late.includes("next sweep will pick it up."), true);
  assert.equal(late.includes("animate-spin"), false);
  assert.equal(late.includes("\u2014"), false);
  assert.equal(late.includes('id="card-1-subject"'), false);

  const ready = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "card-1",
      coco: emptyCoco({
        stage: "draft-ready",
        stageLabel: "Draft ready",
        status: "Read the draft, then approve the wording.",
        touch: 1,
        subject: "A week in Drumheller",
        body: "Ada, a team of 12 can come for three days. Reply if a spring week is useful.\n\nChristopher",
        canApproveWording: true,
      }),
      subject: "A week in Drumheller",
      body: "Ada, a team of 12 can come for three days. Reply if a spring week is useful.\n\nChristopher",
    }),
  );
  assert.equal(ready.includes("Coco drafting"), false);
  assert.equal(ready.includes("A week in Drumheller"), true);
  assert.equal(ready.includes("Ada, a team of 12 can come for three days."), true);
  assert.equal(controlLabels(ready).includes("Approve wording"), true);
  assert.equal(controlLabels(ready).includes("Save copy"), true);

  const blocked = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "card-1",
      coco: emptyCoco({ stage: "blocked", stageLabel: "Blocked", canApproveDraft: false, blocked: ["There is no email address."] }),
      subject: "",
      body: "",
    }),
  );
  assert.equal(blocked.includes("Coco drafting"), false);
  assert.equal(blocked.includes("There is no email address."), true);
});

test("draft polling stops when the draft arrives, the card closes, or the wait runs out", () => {
  assert.equal(cocoAwaitingDraft(emptyCoco({ stage: "queued", subject: "", body: "" })), true);
  assert.equal(cocoAwaitingDraft(emptyCoco({ stage: "drafting", subject: "", body: "" })), true);
  assert.equal(cocoAwaitingDraft(emptyCoco({ stage: "queued", subject: "A week in Drumheller", body: "" })), false);
  assert.equal(cocoAwaitingDraft(emptyCoco({ stage: "draft-ready", subject: "A week in Drumheller", body: "Hello." })), false);
  assert.equal(cocoAwaitingDraft(emptyCoco({ stage: "approved" })), false);
  assert.equal(cocoAwaitingDraft(emptyCoco({ stage: "blocked" })), false);

  assert.equal(draftPollDecision({ awaiting: true, elapsedMs: 0 }), "poll");
  assert.equal(draftPollDecision({ awaiting: true, elapsedMs: COCO_DRAFT_WAIT_MS - 1 }), "poll");
  assert.equal(draftPollDecision({ awaiting: true, elapsedMs: COCO_DRAFT_WAIT_MS }), "stop-timeout");
  assert.equal(draftPollDecision({ awaiting: false, elapsedMs: 0 }), "stop-ready");
  assert.equal(draftPollDecision({ awaiting: true, elapsedMs: 1_000, closed: true }), "stop-left");
  assert.equal(COCO_DRAFT_POLL_MS >= 10_000 && COCO_DRAFT_POLL_MS <= 15_000, true);
  assert.equal(COCO_DRAFT_POLL_MS < COCO_DRAFT_WAIT_MS, true);
});
