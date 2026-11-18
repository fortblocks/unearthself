import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HUNTER_DAILY_CALL_CAP, HUNTER_SIGNALS } from "../data/hunter-profile.ts";
import { scoreCompany, type Company } from "./lead-score.ts";
import {
  advanceCursor,
  cardSource,
  fileHunterCards,
  freshHunterState,
  hunterAccessPoints,
  hunterMayCall,
  hunterPrompt,
  hunterSlots,
  scoreHunter,
  selectHunterRows,
  slotAt,
  travelPoints,
  verifyHunterDrafts,
  type HunterDraft,
} from "./leads-hunter.ts";

const page = `
Acme Alpine builds outdoor apparel in Berlin, Germany.
We run a distributed team and publish a leadership development programme.
Our people lead is Laura Starchuk, Head of People.
Write to laura@acmealpine.example.
Employees: 4000. Noted on 2026-11-01: hiring a guide.
`;

const url = "https://acmealpine.example/about";

function draft(over: Partial<HunterDraft> = {}): HunterDraft {
  return {
    domain: "acmealpine.example",
    org: "Acme Alpine",
    place: "Berlin, Germany",
    industry: "apparel",
    sizeBand: "4000",
    sourceUrl: url,
    signals: [
      {
        kind: "hiring",
        date: "2026-11-01",
        sourceUrl: url,
        note: "hiring a guide",
      },
    ],
    profileSignals: [
      { id: "distributed", sourceUrl: url },
      { id: "leadership", sourceUrl: url },
      { id: "boundaries", sourceUrl: url },
    ],
    buyer: {
      name: "Laura Starchuk",
      title: "Head of People",
      email: "laura@acmealpine.example",
      emailSource: url,
    },
    ...over,
  };
}

function company(over: Partial<Company> = {}): Company {
  return {
    id: "C-01",
    org: "Acme Alpine",
    domain: "acmealpine.example",
    city: "Calgary",
    industry: "energy",
    sizeBand: "80-800",
    sourceUrl: "https://acmealpine.example",
    why: "Scout card. Leave this sentence.",
    buyerName: "Keep Me",
    buyerTitle: "People lead",
    email: "",
    emailSource: "",
    timingNote: "",
    timingScore: 4,
    status: "watch",
    filedLeadId: "",
    draftSubject: "Keep subject",
    draftBody: "Keep body",
    lastTouch: "2026-11-01",
    scoutBatch: "2026-11-01",
    ...over,
  };
}

test("selectHunterRows keeps a small European company and a United States company", () => {
  const rows = selectHunterRows({
    companies: [
      draft(),
      draft({
        domain: "https://www.range.example",
        org: "Range Co",
        place: "Denver, United States",
        sizeBand: "12",
        sourceUrl: "https://range.example",
      }),
      draft({ domain: "nosource.example", sourceUrl: "" }),
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.domain, "acmealpine.example");
  assert.equal(rows[1]?.domain, "range.example");
  assert.equal(rows[1]?.sizeBand, "12");
});

test("verifyHunterDrafts keeps only text that is on the page", () => {
  const [card] = verifyHunterDrafts([draft({ buyer: { ...draft().buyer, email: "guessed@acmealpine.example", title: "Invented Title" } })], { [url]: page }, {
    regionId: "europe",
    today: "2026-11-18",
  });
  assert.ok(card);
  assert.equal(card.city, "Elsewhere");
  assert.equal(card.place, "Berlin, Germany");
  assert.equal(card.buyerName, "Laura Starchuk");
  assert.equal(card.buyerTitle, "");
  assert.equal(card.email, "");
  assert.deepEqual(
    card.profileHits.map((hit) => hit.id),
    ["distributed", "leadership"],
  );
  assert.equal(card.partnerFlag.flagged, true);
  assert.match(card.partnerFlag.reason, /Outdoor or adventure brand/);
  assert.equal(card.partnerFlag.sourceUrl, url);
  assert.equal(card.signals.length, 1);
  assert.equal(card.hunterBreak.travel, 5);
  assert.equal(card.hunterBreak.profile, 14);
  assert.equal(card.hunterBreak.access, 15);
  assert.ok(card.hunterScore > 0);
});

test("a United States company is scored, not dropped", () => {
  const denver = "Range Co is in Denver, United States. We are a distributed team.";
  const source = "https://range.example/about";
  const cards = verifyHunterDrafts(
    [
      draft({
        domain: "range.example",
        org: "Range Co",
        place: "Denver, United States",
        sizeBand: "12",
        sourceUrl: source,
        signals: [],
        profileSignals: [{ id: "distributed", sourceUrl: source }],
        buyer: { name: "", title: "", email: "", emailSource: "" },
      }),
    ],
    { [source]: denver },
    { regionId: "us", today: "2026-11-18" },
  );
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.hunterBreak.travel, 8);
  assert.equal(cards[0]?.sizeBand, "unknown");
});

test("hunter access uses the scout access rules", () => {
  const input = {
    buyerName: "Laura Starchuk",
    email: "laura@acmealpine.example",
    emailSource: url,
    sourceUrl: url,
  };
  const scout = scoreCompany({
    city: "Calgary",
    industry: "energy",
    sizeBand: "80-800",
    ...input,
    signals: [],
    today: "2026-11-18",
  }).access;
  assert.equal(hunterAccessPoints(input), scout);
  assert.equal(hunterAccessPoints({ ...input, buyerName: "People team" }) < scout, true);
});

test("travel points stay above zero", () => {
  assert.equal(travelPoints("canada"), 10);
  assert.equal(travelPoints("us"), 8);
  assert.equal(travelPoints("europe"), 5);
  assert.equal(travelPoints("anywhere"), 2);
  assert.ok(travelPoints("missing") >= 1);
  const score = scoreHunter({
    hitIds: [],
    buyerName: "",
    email: "",
    emailSource: "",
    sourceUrl: "",
    signals: [],
    today: "2026-11-18",
    regionId: "anywhere",
  });
  assert.equal(score.travel, 2);
  assert.equal(score.total, score.profile + score.access + score.timing + score.travel);
});

test("a known domain is updated and a new domain is filed once", () => {
  const [card] = verifyHunterDrafts([draft()], { [url]: page }, { regionId: "europe", today: "2026-11-18" });
  assert.ok(card);
  const first = fileHunterCards([company()], [card], { today: "2026-11-18" });
  assert.equal(first.companies.length, 1);
  assert.equal(first.updated, 1);
  assert.equal(first.filed, 0);
  assert.equal(first.companies[0]?.why, "Scout card. Leave this sentence.");
  assert.equal(first.companies[0]?.buyerName, "Keep Me");
  assert.equal(first.companies[0]?.draftBody, "Keep body");
  assert.equal(first.companies[0]?.source, undefined);
  assert.equal(first.companies[0]?.scoutBatch, "2026-11-01");
  assert.ok((first.companies[0]?.signals?.length ?? 0) >= 1);
  assert.equal(typeof first.companies[0]?.hunterScore, "number");

  const second = fileHunterCards([], [card], { today: "2026-11-18" });
  assert.equal(second.filed, 1);
  assert.equal(second.companies.length, 1);
  assert.equal(second.companies[0]?.source, "hunter");
  assert.equal(second.companies[0]?.status, "watch");
  assert.equal(second.companies[0]?.draftBody, "");
  assert.equal(second.companies[0]?.draftSubject, "");
  const again = fileHunterCards(second.companies, [card], { today: "2026-11-18" });
  assert.equal(again.companies.length, 1);
  assert.equal(again.filed, 0);
  assert.equal(again.updated, 1);
});

test("the batch cursor walks signal and region, then wraps", () => {
  const slots = hunterSlots();
  assert.equal(slots.length, HUNTER_SIGNALS.length * 6);
  assert.equal(slotAt(0).slot.signalId, HUNTER_SIGNALS[0]?.id);
  assert.equal(slotAt(0).slot.regionId, "canada");
  assert.equal(advanceCursor(slots.length - 1), 0);
  assert.notEqual(slotAt(1).slot.regionId, slotAt(0).slot.regionId);
});

test("the daily cap and the pause flag stop a call", () => {
  const state = freshHunterState();
  assert.equal(state.paused, false);
  assert.equal(hunterMayCall(state, "2026-11-18"), true);
  assert.equal(hunterMayCall({ ...state, paused: true }, "2026-11-18"), false);
  assert.equal(hunterMayCall({ ...state, callsOn: "2026-11-18", callsToday: HUNTER_DAILY_CALL_CAP }, "2026-11-18"), false);
  assert.equal(hunterMayCall({ ...state, callsOn: "2026-11-17", callsToday: HUNTER_DAILY_CALL_CAP }, "2026-11-18"), true);
  assert.equal(HUNTER_DAILY_CALL_CAP, 48);
});

test("card source distinguishes hunter, scout, and hand", () => {
  assert.equal(cardSource({ source: "hunter", scoutBatch: "2026-11-18" }), "hunter");
  assert.equal(cardSource({ scoutBatch: "2026-11-18" }), "scout");
  assert.equal(cardSource({ scoutBatch: "seed-2026-09" }), "hand");
  assert.equal(cardSource({}), "hand");
});

test("the hunter prompt is driven by the profile and does not name a data vendor", () => {
  const prompt = hunterPrompt(slotAt(0).slot, ["kept.example"]);
  assert.match(prompt, new RegExp(HUNTER_SIGNALS[0]?.search ?? "missing"));
  assert.match(prompt, /kept\.example/);
  assert.equal(/apollo|clay|geolab/i.test(prompt), false);
});

test("the hunter module has no send path and no paid data vendor", () => {
  const source = readFileSync(new URL("./leads-hunter.ts", import.meta.url), "utf8");
  assert.equal(/sendMail|mailto:|resend|apollo|clay/i.test(source), false);
});
