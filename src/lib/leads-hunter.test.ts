import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HUNTER_AFFORDABILITY_SIGNAL_IDS,
  HUNTER_DAILY_CARD_TARGET,
  HUNTER_REGIONS,
  HUNTER_REGION_WEIGHTS,
  HUNTER_REQUIRE_CANADIAN_OFFICE,
  HUNTER_SEARCH_WEIGHTS,
  HUNTER_SIGNALS,
  HUNTER_STRATEGY_REVIEW,
  pageShowsCanadianOffice,
  regionWeightForPlace,
  searchRegionCycle,
} from "../data/hunter-profile.ts";
import { scoreCompany, type Company } from "./lead-score.ts";
import {
  applyHunterWork,
  assignEnrichment,
  hasBuyerContact,
  hunterStop,
  isContactReady,
} from "./hunter-cap.ts";
import {
  advanceCursor,
  cardSource,
  draftDropReason,
  fileHunterCards,
  freshHunterState,
  hunterAccessPoints,
  hunterMayCall,
  hunterPrompt,
  hunterSlots,
  isPublicLinkedInPost,
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

test("a cited page supplies the source URL when the company row has none", () => {
  const rows = selectHunterRows({
    citations: ["https://cited.example/about"],
    companies: [draft({ domain: "cited.example", org: "Cited Co", sourceUrl: "" })],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.sourceUrl, "https://cited.example/about");
});

test("verifyHunterDrafts keeps only text that is on the page", () => {
  const [card] = verifyHunterDrafts([draft({ buyer: { ...draft().buyer, email: "guessed@acmealpine.example", title: "Invented Title" } })], { [url]: page }, {
    regionId: "europe",
    today: "2026-11-18",
    requireCanadianOffice: false,
  });
  assert.ok(card);
  assert.equal(card.city, "Europe");
  assert.equal(card.place, "Berlin, Germany");
  assert.equal(card.buyerName, "Laura Starchuk");
  assert.equal(card.buyerTitle, "");
  assert.equal(card.email, "");
  assert.deepEqual(
    card.profileHits.map((hit) => hit.id),
    ["distributed", "leadership"],
  );
  assert.equal("partnerFlag" in card, false);
  const other = "https://otherco.example/about";
  const [own] = verifyHunterDrafts(
    [draft()],
    {
      [url]: page.replace("outdoor apparel", "wool coats"),
      [other]: "Other Co builds outdoor apparel and runs adventure trips.",
    },
    { regionId: "europe", today: "2026-11-18", requireCanadianOffice: false },
  );
  assert.ok(own);
  assert.equal("partnerFlag" in (own ?? {}), false);
  assert.equal(card.signals.length, 1);
  assert.equal(card.hunterBreak.travel, 3);
  assert.equal(card.hunterBreak.profile, 14);
  assert.equal(card.hunterBreak.access, 15);
  assert.ok(card.hunterScore > 0);
});

test("geography scores a company and never drops it", () => {
  const calgaryPage = "Northwind Energy is in Calgary, Alberta. northwind.example.";
  const seattlePage = "Harbor Software is in Seattle, WA. harbor.example.";
  const halifaxPage = "Atlantic Mills is in Halifax, NS. atlantic.example.";
  const blankPage = "Prairie Tools builds equipment. prairie.example.";
  const buyer = { name: "", title: "", email: "", emailSource: "" };
  const row = (org: string, domain: string, place: string, source: string) =>
    draft({
      org,
      domain,
      place,
      sourceUrl: source,
      signals: [],
      profileSignals: [],
      buyer,
    });
  const opts = { regionId: "canada", today: "2026-11-18", requireCanadianOffice: false };
  const [alberta] = verifyHunterDrafts([row("Northwind Energy", "northwind.example", "Calgary, Alberta", "https://northwind.example/about")], { "https://northwind.example/about": calgaryPage }, opts);
  const [seattle] = verifyHunterDrafts([row("Harbor Software", "harbor.example", "Seattle, WA", "https://harbor.example/about")], { "https://harbor.example/about": seattlePage }, opts);
  const [halifax] = verifyHunterDrafts([row("Atlantic Mills", "atlantic.example", "Halifax, NS", "https://atlantic.example/about")], { "https://atlantic.example/about": halifaxPage }, opts);
  const [unprinted] = verifyHunterDrafts([row("Prairie Tools", "prairie.example", "Calgary, Alberta", "https://prairie.example/about")], { "https://prairie.example/about": blankPage }, opts);
  assert.ok(alberta && seattle && halifax && unprinted);
  assert.equal(alberta.place, "Calgary, Alberta");
  assert.equal(alberta.city, "Calgary");
  assert.equal(alberta.hunterBreak.travel, HUNTER_REGION_WEIGHTS.alberta);
  assert.equal(seattle.place, "Seattle, WA");
  assert.equal(seattle.hunterBreak.travel, HUNTER_REGION_WEIGHTS.californiaWashington);
  assert.equal(halifax.place, "Halifax, NS");
  assert.equal(halifax.hunterBreak.travel, HUNTER_REGION_WEIGHTS.elsewhere);
  assert.equal(unprinted.place, "");
  assert.equal(unprinted.city, "Elsewhere");
  assert.equal(unprinted.hunterBreak.travel, HUNTER_REGION_WEIGHTS.elsewhere);
  assert.ok(alberta.hunterBreak.travel > seattle.hunterBreak.travel);
  assert.ok(seattle.hunterBreak.travel > halifax.hunterBreak.travel);
  assert.ok(halifax.hunterBreak.travel > 0);
  assert.equal(draftDropReason(row("Harbor Software", "harbor.example", "Seattle, WA", "https://harbor.example/about"), seattlePage, "canada", "ok", undefined, false), null);
  assert.equal(draftDropReason(row("Harbor Software", "harbor.example", "Seattle, WA", "https://harbor.example/about"), "", "canada", "blocked"), "blocked");
  assert.equal(regionWeightForPlace("Seattle, WA", "canada"), HUNTER_REGION_WEIGHTS.californiaWashington);
  assert.equal(regionWeightForPlace("Halifax, NS", "us"), HUNTER_REGION_WEIGHTS.elsewhere);
  assert.equal(regionWeightForPlace("", "canada"), HUNTER_REGION_WEIGHTS.elsewhere);
});

test("a Canadian office is required on this branch, and the other checks still come first", () => {
  const seattle = "Harbor Software is in Seattle, WA. harbor.example.";
  const calgary = "Northwind Energy is in Calgary, Alberta. northwind.example.";
  const source = "https://harbor.example/about";
  const dropped = verifyHunterDrafts(
    [draft({ domain: "harbor.example", org: "Harbor Software", place: "Seattle, WA", sourceUrl: source, signals: [], profileSignals: [], buyer: { name: "", title: "", email: "", emailSource: "" } })],
    { [source]: seattle },
    { regionId: "us", today: "2026-11-18" },
  );
  assert.equal(dropped.length, 0);
  assert.equal(pageShowsCanadianOffice(seattle), false);
  assert.equal(pageShowsCanadianOffice(calgary), true);
  const row = draft({ domain: "harbor.example", org: "Harbor Software", place: "Seattle, WA", sourceUrl: source, buyer: { name: "", title: "", email: "", emailSource: "" } });
  assert.equal(draftDropReason(row, seattle, "us", "ok"), "no-canadian-office");
  assert.equal(draftDropReason(row, "", "us", "blocked"), "blocked");
  assert.equal(draftDropReason(row, "Someone else in Seattle.", "us", "ok"), "name-missing");
  assert.equal(draftDropReason({ ...row, sourceUrl: "https://other.example" }, "Harbor Software", "us", "ok"), "domain-mismatch");
  const [kept] = verifyHunterDrafts(
    [draft({ domain: "northwind.example", org: "Northwind Energy", place: "Calgary, Alberta", sourceUrl: "https://northwind.example/about", signals: [], profileSignals: [], buyer: { name: "", title: "", email: "", emailSource: "" } })],
    { "https://northwind.example/about": calgary },
    { regionId: "alberta", today: "2026-11-18" },
  );
  assert.equal(kept?.city, "Calgary");
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
    { regionId: "us", today: "2026-11-18", requireCanadianOffice: false },
  );
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.hunterBreak.travel, HUNTER_REGION_WEIGHTS.unitedStates);
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
  assert.equal(travelPoints("europe"), 3);
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
  const [card] = verifyHunterDrafts([draft()], { [url]: page }, { regionId: "europe", today: "2026-11-18", requireCanadianOffice: false });
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
  assert.equal("partnerFlag" in (first.companies[0] ?? {}), false);

  const second = fileHunterCards([], [card], { today: "2026-11-18" });
  assert.equal(second.filed, 1);
  assert.equal(second.companies.length, 1);
  assert.equal(second.companies[0]?.source, "hunter");
  assert.ok((second.companies[0]?.hunterScore ?? 0) > 0);
  assert.equal(second.companies[0]?.lineage?.method, "xai-web-search");
  assert.equal(second.companies[0]?.review, "unreviewed");
  assert.equal("partnerFlag" in (second.companies[0] ?? {}), false);
  assert.equal(second.companies[0]?.status, "watch");
  assert.equal(second.companies[0]?.draftBody, "");
  assert.equal(second.companies[0]?.draftSubject, "");
  const again = fileHunterCards(second.companies, [card], { today: "2026-11-18" });
  assert.equal(again.companies.length, 1);
  assert.equal(again.filed, 0);
  assert.equal(again.updated, 1);
  assert.equal(second.contactReady, 1);
  assert.equal(second.companies[0]?.enrichment, "enriched");
  assert.equal(again.contactReady, 0);
});

test("a blank name and title on a known card are filled from the verified page", () => {
  const [card] = verifyHunterDrafts([draft()], { [url]: page }, { regionId: "europe", today: "2026-11-18", requireCanadianOffice: false });
  assert.ok(card);
  const blank = company({ buyerName: "", buyerTitle: "", email: "" });
  const filed = fileHunterCards([blank], [card], { today: "2026-11-18" });
  assert.equal(filed.updated, 1);
  assert.equal(filed.companies[0]?.buyerName, "Laura Starchuk");
  assert.equal(filed.companies[0]?.buyerTitle, "Head of People");
  assert.equal(filed.companies[0]?.email, "laura@acmealpine.example");
  assert.equal(filed.companies[0]?.why, "Scout card. Leave this sentence.");
});

test("the batch cursor spends about three quarters of searches on Alberta and Canada", () => {
  const cycle = searchRegionCycle();
  const weight = (id: string) => HUNTER_SEARCH_WEIGHTS[id as keyof typeof HUNTER_SEARCH_WEIGHTS];
  const count = (id: string) => cycle.filter((regionId) => regionId === id).length;
  assert.equal(cycle.length, Object.values(HUNTER_SEARCH_WEIGHTS).reduce((sum, n) => sum + n, 0));
  assert.equal(count("alberta"), weight("alberta"));
  assert.equal(count("canada"), weight("canada"));
  assert.equal(count("alberta") + count("canada"), 21);
  assert.ok(count("alberta") > count("canada"));
  assert.ok(count("us") > count("europe"));
  assert.equal(count("us"), weight("us"));
  const slots = hunterSlots();
  assert.equal(slots.length, (HUNTER_SIGNALS.length + 1) * cycle.length);
  assert.equal(slots.filter((slot) => slot.source === "public-linkedin").length, cycle.length);
  assert.equal(slotAt(0).slot.signalId, HUNTER_SIGNALS[0]?.id);
  assert.equal(slotAt(0).slot.regionId, cycle[0]);
  assert.equal(advanceCursor(slots.length - 1), 0);
  const canadaShare = slots.filter((slot) => slot.regionId === "alberta" || slot.regionId === "canada").length / slots.length;
  assert.ok(canadaShare >= 0.74 && canadaShare <= 0.76);
});

test("the daily stop is the contact-ready ceiling, and calls do not stop the day", () => {
  const state = freshHunterState();
  const today = "2026-11-18";
  assert.equal(HUNTER_DAILY_CARD_TARGET, 48);
  assert.equal(state.paused, false);
  assert.equal(hunterMayCall(state, today), true);
  assert.equal(hunterMayCall({ ...state, paused: true }, today), false);
  assert.equal(
    hunterMayCall({ ...state, filedOn: today, filedToday: HUNTER_DAILY_CARD_TARGET, callsToday: 3, callsOn: today }, today),
    false,
  );
  assert.equal(hunterStop({ ...state, filedOn: today, filedToday: 48 }, today), "cards");
  assert.equal(hunterMayCall({ ...state, callsOn: today, callsToday: 200, filedOn: today, filedToday: 10 }, today), true);
  assert.equal(hunterStop({ ...state, callsOn: today, callsToday: 200, filedOn: today, filedToday: 10 }, today), null);
  assert.equal(hunterMayCall({ ...state, callsOn: "2026-11-17", callsToday: 200, filedOn: "2026-11-17", filedToday: 48 }, today), true);
});

test("calls are counted, and a high call count does not file a capacity problem", () => {
  const today = "2026-11-18";
  const state = freshHunterState();
  const short = applyHunterWork(
    { ...state, filedOn: today, filedToday: 10, callsOn: today, callsToday: 70 },
    today,
    { calls: 3, contactReady: 0 },
  );
  assert.equal(short.callsToday, 73);
  assert.equal(short.filedToday, 10);
  assert.equal("capacity" in short, false);
  assert.equal(hunterMayCall(short, today), true);

  const filled = applyHunterWork(
    { ...state, filedOn: today, filedToday: 47, callsOn: today, callsToday: 70 },
    today,
    { calls: 1, contactReady: 1 },
  );
  assert.equal(filled.filedToday, 48);
  assert.equal(hunterStop(filled, today), "cards");
  assert.equal(hunterMayCall(filled, today), false);
});

test("only an Enriched card with a sourced fact, a name, a title, and an email is contact-ready", () => {
  const contact = {
    buyerName: "Laura Starchuk",
    buyerTitle: "Head of People",
    email: "laura@acmealpine.example",
    emailSource: url,
  };
  assert.equal(hasBuyerContact(contact), true);
  assert.equal(hasBuyerContact({ ...contact, buyerName: "People team" }), false);
  assert.equal(hasBuyerContact({ ...contact, buyerName: "Laura" }), false);
  assert.equal(hasBuyerContact({ ...contact, buyerTitle: "" }), false);
  assert.equal(hasBuyerContact({ ...contact, email: "" }), false);

  const base = company({ ...contact, profileHits: [{ id: "distributed", label: "Distributed", sourceUrl: url }] });
  const enriched = assignEnrichment(base, "2026-11-18");
  assert.equal(enriched.enrichment, "enriched");
  assert.equal(isContactReady(enriched), true);

  const quiet = assignEnrichment(company({ ...contact, profileHits: [], signals: [], whySources: [] }), "2026-11-18");
  assert.equal(quiet.enrichment, "no-signal");
  assert.equal(quiet.enrichmentOn, "2026-11-18");
  assert.equal(isContactReady(quiet), false);

  const research = assignEnrichment(company({ ...contact, email: "" }), "2026-11-18");
  assert.equal(research.enrichment, "not-enriched");
  assert.equal(isContactReady(research), false);
  assert.equal(isContactReady({ ...enriched, enrichment: "not-enriched" }), false);
  assert.equal(isContactReady({ ...enriched, profileHits: [], signals: [], whySources: [] }), false);
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
  assert.match(prompt, /Drumheller/);
  assert.match(prompt, /6 to 24/);
  assert.match(prompt, /2 to 5 day/);
  assert.equal(/any size|any industry|small company is allowed/i.test(prompt), false);
  assert.equal(prompt.includes("\u2014"), false);
  assert.equal(HUNTER_REQUIRE_CANADIAN_OFFICE, true);
  assert.match(prompt, /real office or a team in Canada/);
  assert.equal(/real office or a team in Canada/.test(hunterPrompt(slotAt(0).slot, [], false)), false);
  assert.equal(/apollo|clay|geolab/i.test(prompt), false);
});

test("the hunter module has no send path", () => {
  const source = readFileSync(new URL("./leads-hunter.ts", import.meta.url), "utf8");
  assert.equal(/sendMail|mailto:|resend|clay/i.test(source), false);
  assert.equal(/api_key=|APOLLO_API_KEY\s*[:=]\s*["'][^"']+["']/i.test(source), false);
});

test("region weights are a soft monthly priority, and Europe matches Mexico", () => {
  assert.equal(HUNTER_STRATEGY_REVIEW.fixed, false);
  assert.equal(HUNTER_STRATEGY_REVIEW.cadence, "monthly");
  assert.equal(HUNTER_REGION_WEIGHTS.europe, HUNTER_REGION_WEIGHTS.mexico);
  assert.equal(regionWeightForPlace("Calgary, Alberta", "canada"), HUNTER_REGION_WEIGHTS.alberta);
  assert.equal(regionWeightForPlace("Toronto, Canada", "canada"), HUNTER_REGION_WEIGHTS.canada);
  assert.equal(regionWeightForPlace("Vancouver, Canada", "canada"), HUNTER_REGION_WEIGHTS.vancouver);
  assert.equal(regionWeightForPlace("San Francisco, California, United States", "us"), HUNTER_REGION_WEIGHTS.californiaWashington);
  assert.equal(regionWeightForPlace("Seattle, Washington, United States", "us"), HUNTER_REGION_WEIGHTS.californiaWashington);
  assert.equal(regionWeightForPlace("Washington, DC, United States", "us"), HUNTER_REGION_WEIGHTS.unitedStates);
  assert.equal(regionWeightForPlace("Albuquerque, New Mexico, United States", "us"), HUNTER_REGION_WEIGHTS.unitedStates);
  assert.equal(regionWeightForPlace("Berlin, Germany", "europe"), HUNTER_REGION_WEIGHTS.europe);
  assert.equal(regionWeightForPlace("Mexico City, Mexico", "latin-america"), HUNTER_REGION_WEIGHTS.mexico);
  assert.ok(HUNTER_REGION_WEIGHTS.alberta > HUNTER_REGION_WEIGHTS.canada);
  assert.ok(HUNTER_REGION_WEIGHTS.canada > HUNTER_REGION_WEIGHTS.vancouver);
  assert.ok(HUNTER_REGION_WEIGHTS.vancouver > HUNTER_REGION_WEIGHTS.californiaWashington);
  assert.ok(HUNTER_REGION_WEIGHTS.californiaWashington > HUNTER_REGION_WEIGHTS.unitedStates);
  assert.ok(HUNTER_REGION_WEIGHTS.unitedStates > HUNTER_REGION_WEIGHTS.europe);
});

test("Europe and Mexico stay searchable", () => {
  const mexico = "Casa Norte is in Mexico City, Mexico. casa.example. We are a software company.";
  const source = "https://casa.example/about";
  const cards = verifyHunterDrafts(
    [
      draft({
        domain: "casa.example",
        org: "Casa Norte",
        place: "Mexico City, Mexico",
        sourceUrl: source,
        signals: [],
        profileSignals: [{ id: "big-tech", sourceUrl: source }],
        buyer: { name: "", title: "", email: "", emailSource: "" },
      }),
    ],
    { [source]: mexico },
    { regionId: "latin-america", today: "2026-11-18", requireCanadianOffice: false },
  );
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.hunterBreak.travel, HUNTER_REGION_WEIGHTS.mexico);
  assert.deepEqual(cards[0]?.profileHits.map((hit) => hit.id), ["big-tech"]);
});

test("an affordability signal counts only when the phrase is on the page", () => {
  const source = "https://soft.example/about";
  const base = {
    domain: "soft.example",
    org: "Soft Co",
    place: "Calgary, Canada",
    sourceUrl: source,
    signals: [],
    profileSignals: [{ id: "big-tech", sourceUrl: source }],
    buyer: { name: "", title: "", email: "", emailSource: "" },
  };
  const [missed] = verifyHunterDrafts([draft(base)], { [source]: "Soft Co in Calgary, Canada. soft.example." }, { regionId: "canada", today: "2026-11-18" });
  assert.equal(missed?.profileHits.length, 0);
  const [hit] = verifyHunterDrafts(
    [draft(base)],
    { [source]: "Soft Co in Calgary, Canada. soft.example. We are a software company." },
    { regionId: "canada", today: "2026-11-18" },
  );
  assert.deepEqual(hit?.profileHits.map((item) => item.id), ["big-tech"]);
  assert.deepEqual(
    HUNTER_AFFORDABILITY_SIGNAL_IDS.map((id) => HUNTER_SIGNALS.find((signal) => signal.id === id)?.id),
    ["big-tech", "funding", "events-hiring", "travel-tieup"],
  );
});

test("a departed contact is replaced only by a successor on the same page", () => {
  const moved = `
Acme Alpine builds outdoor apparel in Berlin, Germany.
We run a distributed team.
Laura Starchuk is now at Other Co.
Alex Reid, Head of People. Write to alex@acmealpine.example.
`;
  const [kept] = verifyHunterDrafts(
    [draft({ buyer: { name: "Laura Starchuk", title: "Head of People", email: "laura@acmealpine.example", emailSource: url } })],
    { [url]: moved },
    { regionId: "europe", today: "2026-11-18", requireCanadianOffice: false },
  );
  assert.ok(kept);
  assert.equal(kept?.buyerName, "Alex Reid");
  assert.equal(kept?.buyerTitle, "Head of People");
  assert.equal(kept?.email, "alex@acmealpine.example");
  assert.equal(kept?.email.includes("laura@"), false);

  const gone = moved.replace("Alex Reid, Head of People. Write to alex@acmealpine.example.", "The role is open.");
  const [open] = verifyHunterDrafts(
    [draft({ buyer: { name: "Laura Starchuk", title: "Head of People", email: "laura@acmealpine.example", emailSource: url } })],
    { [url]: gone },
    { regionId: "europe", today: "2026-11-18", requireCanadianOffice: false },
  );
  assert.ok(open);
  assert.equal(open?.org, "Acme Alpine");
  assert.equal(open?.buyerName, "");
  assert.equal(open?.email, "");
});

test("public LinkedIn posts are a source, and profiles are not", () => {
  const post = "https://www.linkedin.com/posts/acme_team-offsite";
  const text = "Acme Alpine in Calgary, Canada. acmealpine.example. Our team offsite is next month. Alex Reid, Head of People. alex@acmealpine.example.";
  const cards = verifyHunterDrafts(
    [
      draft({
        place: "Calgary, Canada",
        sourceUrl: post,
        sourceKind: "public-linkedin",
        signals: [],
        profileSignals: [{ id: "offsite", sourceUrl: post }],
        buyer: { name: "Alex Reid", title: "Head of People", email: "alex@acmealpine.example", emailSource: post },
      }),
    ],
    { [post]: text },
    { regionId: "canada", today: "2026-11-18" },
  );
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.buyerName, "Alex Reid");
  assert.equal(cards[0]?.email, "alex@acmealpine.example");
  assert.deepEqual(cards[0]?.profileHits.map((hit) => hit.id), ["offsite"]);
  const filed = fileHunterCards([], cards, { today: "2026-11-18", floor: 0 });
  assert.equal(filed.companies[0]?.lineage?.method, "public-linkedin-post");

  const profile = "https://www.linkedin.com/in/alex-reid";
  assert.equal(isPublicLinkedInPost(post), true);
  assert.equal(isPublicLinkedInPost(profile), false);
  assert.equal(isPublicLinkedInPost("https://www.linkedin.com/login"), false);
  const rejected = verifyHunterDrafts(
    [draft({ sourceUrl: profile, sourceKind: "public-linkedin", place: "Calgary, Canada", buyer: { name: "", title: "", email: "", emailSource: "" } })],
    { [profile]: text },
    { regionId: "canada", today: "2026-11-18" },
  );
  assert.equal(rejected.length, 0);
  assert.equal(draftDropReason(draft({ sourceUrl: profile, sourceKind: "public-linkedin" }), text, "canada"), "unverified");

  const linkedin = hunterSlots().find((slot) => slot.source === "public-linkedin");
  assert.ok(linkedin);
  const prompt = hunterPrompt(linkedin ?? slotAt(0).slot, []);
  assert.match(prompt, /\/posts\//);
  assert.match(prompt, /Do not log in/);
  assert.equal(/apollo|clay|geolab/i.test(prompt), false);
});

test("another studio is skipped without being named in the prompt", () => {
  const rows = selectHunterRows({
    companies: [draft({ domain: "studio.example", org: "Geolab Studio", sourceUrl: "https://studio.example" }), draft()],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.org, "Acme Alpine");
  assert.equal(/geolab/i.test(hunterPrompt(slotAt(0).slot, [])), false);
});
