import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import {
  cocoAwaitingDraft,
  COCO_DRAFT_POLL_MS,
  COCO_DRAFT_WAIT_MS,
  companiesOnDesk,
  DRAFT_FLAGGED_COPY,
  draftPanelKind,
  draftPollDecision,
  emptyCoco,
  hasDraftCopy,
  leadInPhaseOne,
  leadOnDesk,
  storedJudgmentHides,
  LeadCardActions,
  skipReasonLines,
} from "./lead-card-view.ts";
import type { CocoJoin, CocoStage } from "./hunter-outreach.ts";
import { scoreCompany, type Company } from "./lead-score.ts";
import { deskScoreRank } from "./leads-table.ts";

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
  emptyCoco({
    stage: "draft-flagged",
    stageLabel: "Draft flagged",
    status: 'The draft says "Tess and I".',
    subject: "A note",
    body: "Tess and I will write.",
    touch: 1,
    draftFlag: 'The draft says "Tess and I".',
    draftRejected: { at: "2026-11-20T19:40:00.000Z", check: "tess-and-i" },
    canApproveDraft: false,
  }),
];

function controlLabels(html: string) {
  return [...html.matchAll(/<(button|a|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) =>
    match[2]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ?? "",
  );
}

function deskCard(partial: Partial<Company> & { id: string }): Company {
  return {
    id: partial.id,
    org: partial.org ?? "Northwind Example",
    domain: partial.domain ?? "northwind.example",
    city: partial.city ?? "Calgary",
    industry: partial.industry ?? "energy",
    sizeBand: partial.sizeBand ?? "80-800",
    sourceUrl: partial.sourceUrl ?? "https://northwind.example/about",
    why: "The about page names a leadership offsite.",
    buyerName: partial.buyerName ?? "Ada North",
    buyerTitle: "People Lead",
    email: partial.email ?? "ada@northwind.example",
    emailSource: partial.emailSource ?? "https://northwind.example/contact",
    timingNote: "",
    timingScore: partial.timingScore ?? 0,
    status: partial.status ?? "watch",
    filedLeadId: "",
    draftSubject: "",
    draftBody: "",
    lastTouch: "",
    scoutBatch: "",
    emailMx: partial.emailMx,
    cardFlags: partial.cardFlags,
    hunterScore: partial.hunterScore,
    place: partial.place,
    buyerJudgment: partial.buyerJudgment,
  };
}

test("a card with a person and a verified email is listed below 70, and a blocked card is not", () => {
  const hold = deskCard({ id: "hold", city: "Elsewhere", place: "Halifax, Nova Scotia", sizeBand: "unknown", industry: "other", hunterScore: 12 });
  const watch = deskCard({ id: "watch", city: "Calgary", sizeBand: "80-800", industry: "other", hunterScore: 40 });
  const higher = deskCard({ id: "higher", city: "Calgary", sizeBand: "unknown", industry: "energy", hunterScore: 80 });
  const blank = deskCard({ id: "blank", email: "   " });
  const missing = deskCard({ id: "missing", email: "" });
  const flagged = deskCard({ id: "stale", cardFlags: ["Stale"] });
  const stopped = deskCard({ id: "stopped", status: "stopped" });
  assert.equal(scoreCompany(hold).band, "hold");
  assert.ok(scoreCompany(hold).total < 50);
  assert.equal(scoreCompany(watch).band, "watch");
  assert.ok(scoreCompany(watch).total >= 50 && scoreCompany(watch).total <= 69);

  const visible = companiesOnDesk([hold, watch, higher, blank, missing, flagged, stopped]);
  assert.deepEqual(
    visible.map((row) => row.id),
    ["hold", "watch", "higher"],
  );
  assert.equal(leadOnDesk(higher, ["This contact is on the do-not-contact list."]), true);
  assert.equal(leadOnDesk(higher, ["Mail to this address bounced."]), true);
  assert.deepEqual(
    companiesOnDesk([higher], { higher: ["This contact is on the do-not-contact list."] }).map((row) => row.id),
    ["higher"],
  );
  assert.equal(leadOnDesk(flagged), false);
  assert.equal(leadOnDesk(blank), false);

  const ranked = [...visible].sort((a, b) => deskScoreRank({ company: b, score: scoreCompany(b) }).value - deskScoreRank({ company: a, score: scoreCompany(a) }).value);
  assert.deepEqual(
    ranked.map((row) => row.id),
    ["higher", "watch", "hold"],
  );
  assert.equal(deskScoreRank({ company: higher, score: scoreCompany(higher) }).field, "hunterScore");
  const unscored = deskCard({ id: "plain" });
  delete unscored.hunterScore;
  const plainScore = scoreCompany(unscored);
  assert.equal(deskScoreRank({ company: unscored, score: plainScore }).field, "fit");
  assert.equal(deskScoreRank({ company: unscored, score: { total: plainScore.total } }).field, "total");
});

test("cards outside Canada and the United States stay stored and leave the lists", () => {
  const calgary = deskCard({ id: "calgary", city: "Calgary" });
  const denver = deskCard({ id: "denver", city: "Elsewhere", place: "Denver, United States" });
  const berlin = deskCard({ id: "berlin", city: "Elsewhere", place: "Berlin, Germany" });
  const unknown = deskCard({ id: "unknown", city: "Elsewhere", place: "  " });
  const book = [calgary, denver, berlin, unknown];
  assert.equal(leadInPhaseOne(calgary), true);
  assert.equal(leadInPhaseOne(denver), true);
  assert.equal(leadInPhaseOne(berlin), false);
  assert.equal(leadInPhaseOne(unknown), false);
  assert.deepEqual(
    companiesOnDesk(book).map((row) => row.id),
    ["calgary", "denver"],
  );
  assert.equal(book.length, 4);
  assert.equal(book[2], berlin);
  assert.equal(berlin.place, "Berlin, Germany");
  assert.equal(berlin.org, "Northwind Example");
  assert.equal(leadOnDesk(berlin), false);
  assert.equal(leadOnDesk(denver), true);
});

test("the desk hides a card only when the stored judgement says not a buyer", () => {
  const open = deskCard({ id: "open" });
  const buyer = deskCard({
    id: "buyer",
    buyerJudgment: {
      buyer: true,
      confidence: "high",
      reason: "The company context and the role fit a team retreat.",
      model: "grok-4.20-0309-non-reasoning",
    },
  });
  const declined = deskCard({
    id: "declined",
    buyerJudgment: {
      buyer: false,
      confidence: "high",
      reason: "The role does not buy team retreats for this company.",
      model: "grok-4.20-0309-non-reasoning",
    },
  });
  const unsure = deskCard({
    id: "unsure",
    buyerJudgment: {
      buyer: true,
      confidence: "low",
      reason: "The role might buy a retreat, and the company context is thin.",
      model: "grok-4.20-0309-non-reasoning",
    },
  });
  const book = [open, buyer, declined, unsure];
  assert.equal(storedJudgmentHides(open), false);
  assert.equal(storedJudgmentHides(buyer), false);
  assert.equal(storedJudgmentHides(declined), true);
  assert.deepEqual(
    companiesOnDesk(book).map((row) => row.id),
    ["open", "buyer"],
  );
  assert.equal(book.length, 4);
  assert.equal(book[2], declined);
  assert.equal(declined.buyerName, "Ada North");
  assert.equal(declined.buyerJudgment?.buyer, false);
  assert.equal(leadOnDesk(open), true);
  assert.equal(leadOnDesk(declined), false);
});

test("Coco's skip reason is shown once", () => {
  const coco = emptyCoco({
    stage: "draft-skipped",
    stageLabel: "Draft skipped: No retreat fit",
    status: "Coco skipped this draft. No retreat fit",
    skipNote: "No retreat fit",
  });
  const lines = skipReasonLines(coco);
  const html = renderToStaticMarkup(
    createElement(LeadCardActions, { cardId: "skipped", coco, subject: "", body: "" }),
  );
  assert.equal(lines.stage, "Draft skipped");
  assert.equal(lines.note, "No retreat fit");
  assert.equal(lines.status.includes("No retreat fit"), false);
  assert.equal(html.split("No retreat fit").length - 1, 1);
  assert.equal(html.includes("Draft skipped"), true);
  assert.equal(html.includes("No draft yet."), false);
  assert.equal(html.includes("\u2014"), false);
});

test("a rejected write-back is flagged with the reason, and the skip reason stays one plain line", () => {
  const rejected = emptyCoco({
    stage: "queued",
    stageLabel: "Queued",
    status: "Approved, waiting for Coco.",
    touch: 1,
    draftRejected: { at: "2026-11-20T19:40:00.000Z", check: "em-dash" },
  });
  assert.equal(cocoAwaitingDraft(rejected), true);
  assert.equal(draftPanelKind(rejected, true), "rejected");
  assert.equal(DRAFT_FLAGGED_COPY, "Draft flagged");
  const html = renderToStaticMarkup(
    createElement(LeadCardActions, { cardId: "card-1", coco: rejected, subject: "", body: "" }),
  );
  assert.equal(html.includes("Draft flagged"), true);
  assert.equal(html.includes("The draft has an em dash."), true);
  assert.equal(html.includes("data-draft-flag=\"failed\""), true);
  assert.equal(html.includes("animate-spin"), false);
  assert.equal(html.includes("em-dash"), false);
  assert.equal(html.includes("Coco drafting"), false);
  assert.equal(html.includes("No draft yet."), false);
  assert.equal(html.includes('id="card-1-subject"'), false);
  assert.equal(html.includes("\u2014"), false);

  const accepted = emptyCoco({
    stage: "draft-ready",
    stageLabel: "Draft ready",
    subject: "A week in Drumheller",
    body: "Hello from Drumheller.",
    touch: 1,
    draftRejected: { at: "2026-11-20T19:40:00.000Z", check: "price" },
  });
  assert.equal(cocoAwaitingDraft(accepted), false);
  assert.equal(draftPanelKind(accepted), null);
  const ready = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "card-1",
      coco: accepted,
      subject: "A week in Drumheller",
      body: "Hello from Drumheller.",
    }),
  );
  assert.equal(ready.includes("Draft flagged"), false);
  assert.equal(ready.includes("A week in Drumheller"), true);
});

test("subject and email stay hidden until a draft exists", () => {
  const hidden: Array<{ name: string; coco: CocoJoin; draftWait?: "rejected" }> = [
    { name: "new", coco: emptyCoco({ stage: "new", stageLabel: "Unreviewed" }) },
    { name: "approved", coco: emptyCoco({ stage: "approved", stageLabel: "Approved", status: "Approved." }) },
    { name: "queued", coco: emptyCoco({ stage: "queued", stageLabel: "Queued", status: "Approved, waiting for Coco.", touch: 1 }) },
    { name: "drafting", coco: emptyCoco({ stage: "drafting", stageLabel: "Drafting", status: "Coco is writing the draft.", touch: 1 }) },
    {
      name: "rejected",
      coco: emptyCoco({
        stage: "queued",
        stageLabel: "Queued",
        status: "Approved, waiting for Coco.",
        touch: 1,
        draftRejected: { at: "2026-11-20T20:11:00.000Z", check: "em-dash" },
      }),
      draftWait: "rejected",
    },
    {
      name: "skipped",
      coco: emptyCoco({
        stage: "draft-skipped",
        stageLabel: "Draft skipped",
        skipNote: "No retreat fit",
        status: "",
      }),
    },
  ];
  for (const item of hidden) {
    assert.equal(hasDraftCopy(item.coco.subject, item.coco.body), false, item.name);
    const html = renderToStaticMarkup(
      createElement(LeadCardActions, {
        cardId: "much-better",
        coco: item.coco,
        subject: "   ",
        body: "",
        draftWait: item.draftWait,
      }),
    );
    assert.equal(html.includes('id="much-better-subject"'), false, item.name);
    assert.equal(html.includes('id="much-better-body"'), false, item.name);
    assert.equal(html.includes(">Subject<"), false, item.name);
    assert.equal(html.includes(">Email<"), false, item.name);
    assert.equal(html.includes(">Sources<"), false, item.name);
    assert.equal(controlLabels(html).includes("Save copy"), false, item.name);
    assert.equal(html.includes("\u2014"), false, item.name);
  }
  const retrying = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "much-better",
      coco: hidden[4]?.coco ?? emptyCoco(),
      subject: "",
      body: "",
      draftWait: "rejected",
    }),
  );
  assert.equal(retrying.includes("Draft flagged"), true);
  assert.equal(retrying.includes("The draft has an em dash."), true);
  assert.equal(retrying.includes("data-draft-flag=\"failed\""), true);
  const skipped = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "much-better",
      coco: hidden[5]?.coco ?? emptyCoco(),
      subject: "",
      body: "",
    }),
  );
  assert.equal(skipped.split("No retreat fit").length - 1, 1);

  const drafted = emptyCoco({
    stage: "draft-ready",
    stageLabel: "Draft ready",
    status: "Read the draft, then approve the wording.",
    touch: 1,
    subject: "A week in Drumheller",
    body: "Hello from Drumheller.",
    canApproveWording: true,
  });
  const shown = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "much-better",
      coco: drafted,
      subject: drafted.subject,
      body: drafted.body,
    }),
  );
  assert.equal(shown.includes('id="much-better-subject"'), true);
  assert.equal(shown.includes('id="much-better-body"'), true);
  assert.equal(shown.includes(">Subject<"), true);
  assert.equal(shown.includes(">Email<"), true);
  assert.equal(shown.includes("A week in Drumheller"), true);
    assert.equal(controlLabels(shown).includes("Save draft without sending"), true);
  assert.equal(shown.includes(">Sources<"), false);

  const cited = "https://northwind.example/offsite";
  const withSources = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "much-better",
      coco: emptyCoco({ ...drafted, sources: [{ url: cited, note: "Leadership offsite" }] }),
      subject: drafted.subject,
      body: drafted.body,
    }),
  );
  assert.equal(withSources.includes(">Sources<"), true);
  assert.equal(withSources.includes(`href="${cited}"`), true);
  assert.equal(withSources.includes("Leadership offsite"), true);
  const email = withSources.slice(withSources.indexOf('id="much-better-body"'), withSources.indexOf("</textarea>"));
  assert.equal(email.includes(cited), false);
  assert.equal(email.includes("Leadership offsite"), false);

  const beforeDraft = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "much-better",
      coco: emptyCoco({
        stage: "queued",
        stageLabel: "Queued",
        touch: 1,
        sources: [{ url: cited, note: "Leadership offsite" }],
      }),
      subject: "",
      body: "",
    }),
  );
  assert.equal(beforeDraft.includes(">Sources<"), false);
  assert.equal(beforeDraft.includes(cited), false);

  const edited = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "much-better",
      coco: emptyCoco({ stage: "draft-ready", stageLabel: "Draft ready", touch: 1 }),
      subject: "Edited subject",
      body: "Edited letter.",
    }),
  );
  assert.equal(edited.includes('id="much-better-subject"'), true);
  assert.equal(edited.includes("Edited letter."), true);
});

test("a ready letter keeps the Tess and I warning when the banner does not name it", () => {
  const html = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "card-1",
      coco: emptyCoco({
        stage: "draft-ready",
        stageLabel: "Draft ready",
        subject: "A note",
        body: "Tess and I will write.",
        touch: 1,
      }),
      subject: "A note",
      body: "Tess and I will write.",
    }),
  );
  assert.equal(html.includes("This copy says"), true);
  assert.equal(html.includes("data-draft-flag=\"failed\""), false);
});

test("the card notes when the unsubscribe link was added", () => {
  const html = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "lupio",
      coco: emptyCoco({
        stage: "draft-ready",
        stageLabel: "Draft ready",
        touch: 1,
        subject: "Hello",
        body: "Stored without a link.",
        canApproveWording: true,
        unsubscribeAppended: true,
      }),
      subject: "Hello",
      body: "Stored without a link.",
    }),
  );
  assert.equal(html.includes('data-unsubscribe="preview"'), true);
  assert.equal(html.includes("Email footer (added automatically):"), true);
  assert.equal(html.includes("356 4th Street West, Drumheller, Alberta T0J 0Y3, Canada"), true);
  assert.equal(html.includes("This is a business solicitation from Unearth Self."), true);
  assert.equal(html.includes("Badlands Bootcamp is an Unearth Self programme."), false);
  assert.equal(html.includes("www.unearthself.xyz"), true);
  assert.equal(html.split("Unsubscribe here").length - 1, 1);
  assert.equal(html.includes("contact you again."), true);
  assert.equal(html.includes("<a "), false);
  const preview = html.match(/<p[^>]*data-unsubscribe="preview"[^>]*>[\s\S]*?<\/p>/);
  assert.equal(preview?.[0]?.includes("underline") ?? true, false);
  assert.equal(preview?.[0]?.includes("<br") ?? true, false);
  assert.equal(preview?.[0]?.includes("<a") ?? true, false);
  assert.match(preview?.[0] ?? "", /text-xs/);
  assert.equal(html.includes("[SENDER IDENTIFICATION PENDING LEGAL]"), false);
  assert.equal(controlLabels(html).includes("Approve to send"), true);
  assert.equal(html.includes("\u2014"), false);
});

test("Approve and draft is not offered when the card is not sendable", () => {
  const hidden = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "low",
      coco: emptyCoco({ stage: "new", stageLabel: "Unreviewed", canApproveDraft: false }),
      subject: "",
      body: "",
    }),
  );
  assert.equal(controlLabels(hidden).includes("Ask Coco to draft"), false);

  const shown = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "ready",
      coco: emptyCoco({ stage: "new", stageLabel: "Unreviewed", canApproveDraft: true }),
      subject: "",
      body: "",
    }),
  );
  assert.equal(controlLabels(shown).includes("Ask Coco to draft"), true);
});

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
    assert.equal(html.includes("Hand file"), false, coco.stage);
    assert.equal(html.includes("Back to unreviewed"), false, coco.stage);
    assert.equal(html.includes(">Refresh<"), false, coco.stage);
    const labels = controlLabels(html);
    for (const label of labels) {
      assert.equal(label === "Send", false, `${coco.stage}: ${label}`);
    }
    if (coco.stage === "wording-approved") assert.equal(html.includes("chris@badlandsbootcamp.com"), true);
    if (coco.stage === "new") assert.equal(labels.includes("Wrong size"), true);
    if (coco.stage === "sent") assert.equal(labels.includes("Do not contact this person"), true);
    if (coco.stage === "sent") assert.equal(labels.includes("Do not contact this company"), true);
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
    if (coco.stage === "draft-ready") assert.equal(labels.includes("Approve to send"), true);
    if (coco.stage === "draft-flagged") {
      assert.equal(html.includes("data-draft-flag=\"failed\""), true);
      assert.equal(html.includes("Draft flagged"), true);
      assert.equal(html.includes("The draft says"), true);
      assert.equal(html.includes("This copy says"), false);
      assert.equal(html.includes('id="card-1-subject"'), true);
      assert.equal(html.includes("Rewrite with Coco"), true);
      assert.equal(html.includes("disabled"), true);
      assert.equal(html.includes("animate-spin"), false);
    }
    assert.equal(html.includes(">None yet<"), true, coco.stage);
    assert.equal(html.includes("After they reply"), false, coco.stage);
    assert.equal(html.includes("Close not a fit"), false, coco.stage);
    if (coco.stage === "wording-approved") assert.equal(labels.includes("Take back send approval"), true);
    assert.equal(labels.includes("Ask Coco to draft") || coco.stage !== "new", true);
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
  assert.equal(controlLabels(ready).includes("Approve to send"), true);
  assert.equal(controlLabels(ready).includes("Save draft without sending"), true);

  const link = "https://www.unearthself.xyz/u/payload.signature";
  const linked = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "card-1",
      coco: emptyCoco({
        stage: "draft-ready",
        stageLabel: "Draft ready",
        touch: 1,
        subject: "A week in Drumheller",
        body: `Ada, a team of 12 can come for three days.\n\n<a href="${link}">unsubscribe</a>\nunsubscribe: ${link}`,
        unsubscribeUrl: link,
        canApproveDraft: true,
      }),
      subject: "A week in Drumheller",
      body: `Ada, a team of 12 can come for three days.\n\n<a href="${link}">unsubscribe</a>\nunsubscribe: ${link}`,
    }),
  );
  assert.equal(linked.includes(`href="${link}"`), false);
  assert.equal(linked.includes('data-unsubscribe="preview"'), true);
  assert.equal(linked.includes("Email footer (added automatically):"), true);
  assert.equal(linked.includes("Unsubscribe here"), true);
  const textarea = linked.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/);
  assert.equal(textarea?.[1]?.includes("payload.signature") ?? false, false);
  assert.equal(controlLabels(linked).includes("Approve to send"), true);
  assert.equal(controlLabels(linked).includes("Ask Coco to draft"), false);

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

test("a blocked lead stays on the desk, a bad greeting is flagged, and the humanizer can turn approve off", () => {
  const blocked = deskCard({ id: "centric" });
  assert.equal(leadOnDesk(blocked, ["The Apollo email is not verified."]), true);
  const html = renderToStaticMarkup(
    createElement(LeadCardActions, {
      cardId: "centric",
      coco: emptyCoco({
        stage: "draft-ready",
        stageLabel: "Draft ready",
        touch: 1,
        subject: "A week in Drumheller",
        body: "Hello,",
        greetingNote: "No usable first name. The greeting is Hello.",
        humanizerPass: false,
        humanizerNotes: ["House voice is 120 to 180 words. This is 1."],
        canApproveWording: false,
        canApproveDraft: true,
      }),
      subject: "A week in Drumheller",
      body: "Hello,",
    }),
  );
  assert.equal(html.includes("data-greeting=\"neutral\""), true);
  assert.equal(html.includes("No usable first name. The greeting is Hello."), true);
  assert.equal(html.includes("data-humanizer=\"fail\""), true);
  assert.equal(html.includes("Approve to send is off."), true);
  assert.equal(html.includes("disabled"), true);
  assert.equal(html.includes("Hand file"), false);
  assert.equal(html.includes("Back to unreviewed"), false);
  assert.equal(html.includes("data-send-path=\"explicit\""), true);
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
