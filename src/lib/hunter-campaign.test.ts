import assert from "node:assert/strict";
import test from "node:test";
import type { ApolloOrganization } from "./apollo.ts";
import {
  acceptPage,
  applyBuyerTitleBoost,
  applyHunterSegment,
  apolloProfileSignals,
  CAMPAIGN_PAGES_PER_REGION,
  CANADA_TILT_REASON,
  collectRegion,
  campaignEmployeeRanges,
  companyBuyerBlock,
  CAMPAIGN_STATE_VERSION,
  companySource,
  creditAlarm,
  freshCampaign,
  keywordSignalsOnPage,
  loadCampaignState,
  needsAnotherPage,
  nextWeights,
  pageDropNote,
  phaseOneCountry,
  rankOrganizations,
  regionForDraw,
  searchDraw,
  signOffSuggestion,
  signedSegment,
  stampSearchIndustry,
  STARTING_WEIGHTS,
  suggestSegment,
  THREE_CITY_LOCATIONS,
  withMondaySuggestion,
} from "./hunter-campaign.ts";
import { companySearchParams, readApolloOrganization } from "./apollo.ts";
import { HUNTER_REGION_WEIGHTS, regionWeightForPlace } from "../data/hunter-profile.ts";
import { fileHunterCards, verifyHunterDrafts, type HunterDraft } from "./leads-hunter.ts";

function org(over: Partial<ApolloOrganization> = {}): ApolloOrganization {
  return {
    id: "org-1",
    name: "Northwind",
    domain: "northwind.example",
    website: "https://northwind.example",
    place: "Calgary, Alberta, Canada",
    country: "Canada",
    industry: "information technology & services",
    employees: 18,
    revenue: 2_000_000,
    latestFundingOn: "2026-06-01",
    latestFundingAmount: 1_000_000,
    headcountGrowth: 0.2,
    jobCount: 1,
    jobTitles: ["Head of People"],
    keywords: ["outdoor"],
    technologies: ["Slack"],
    ...over,
  };
}

test("the first segment is technology, signed, with the default split", () => {
  const state = freshCampaign("2026-11-20");
  assert.equal(state.signed, true);
  assert.equal(state.segmentId, "tech");
  assert.equal(signedSegment(state).industries[0], "information technology & services");
  assert.deepEqual(state.split, { canada: 85, us: 15 });
  assert.equal(state.splitReason, CANADA_TILT_REASON);
  assert.equal(state.nextPage.cities, 1);
  assert.equal(state.exhausted.cities, false);
  assert.match(state.planNote, /20th November 2026/);
  assert.equal(companySource(undefined), "campaign");
  assert.equal(companySource("xai"), "xai");
  assert.equal(companySource("campaign"), "campaign");
});

test("a monday suggestion does not replace the signed segment", () => {
  const state = freshCampaign("2026-11-16");
  const suggested = withMondaySuggestion(state, "2026-11-23", { tech: 0, energy: 0 }, {});
  assert.equal(suggested.segmentId, "tech");
  assert.equal(signedSegment(suggested).id, "tech");
  assert.notEqual(suggested.suggestionId, "");
  const signed = signOffSuggestion({ ...suggested, suggestionId: "energy" }, "2026-11-23");
  assert.equal(signed.segmentId, "energy");
  assert.equal(signed.signed, true);
  assert.match(signed.planNote, /signed off/);
});

test("a thin sample keeps the current segment instead of an alphabetical pick", () => {
  const pick = suggestSegment({
    weekStart: "2026-11-09",
    currentSegmentId: "healthcare",
    reviewedBySegment: { tech: 0, energy: 0, professional: 0, healthcare: 0 },
    scoreBySegment: {},
  });
  assert.equal(pick.id, "healthcare");
  assert.match(pick.reason, /current segment/);
  assert.notEqual(pick.id, "energy");
  const exploreTie = suggestSegment({
    weekStart: "2026-11-16",
    currentSegmentId: "professional",
    reviewedBySegment: { tech: 1, energy: 1, professional: 1, healthcare: 1 },
    scoreBySegment: {},
  });
  assert.equal(exploreTie.id, "professional");
  const tied = suggestSegment({
    weekStart: "2026-11-09",
    currentSegmentId: "healthcare",
    reviewedBySegment: { tech: 30, energy: 30, professional: 30, healthcare: 30 },
    scoreBySegment: { tech: 4, energy: 4, professional: 4, healthcare: 4 },
  });
  assert.equal(tied.id, "healthcare");
  const winner = suggestSegment({
    weekStart: "2026-11-09",
    currentSegmentId: "tech",
    reviewedBySegment: { tech: 30, energy: 30 },
    scoreBySegment: { tech: 1, energy: 9 },
  });
  assert.equal(winner.id, "energy");
  assert.match(winner.reason, /conversion/i);
  const monday = withMondaySuggestion(freshCampaign("2026-11-16"), "2026-11-23", {}, {});
  assert.equal(monday.segmentId, "tech");
  assert.equal(monday.suggestionId, "tech");
  assert.equal(signedSegment({ ...freshCampaign("2026-11-20"), signed: false, segmentId: "healthcare" }).id, "healthcare");
});

test("Hunter can switch the active segment and the switch is logged", () => {
  const state = freshCampaign("2026-11-24");
  const rejected = applyHunterSegment(state, { segmentId: "sales", reason: "Sales booked more often last week.", today: "2026-11-24", at: "2026-11-24T17:47:00.000Z" });
  assert.equal("error" in rejected, true);
  const short = applyHunterSegment(state, { segmentId: "energy", reason: "short", today: "2026-11-24", at: "2026-11-24T17:47:00.000Z" });
  assert.equal("error" in short, true);
  const next = applyHunterSegment(state, {
    segmentId: "energy",
    reason: "Energy replies converted more often than technology.",
    today: "2026-11-24",
    at: "2026-11-24T17:47:00.000Z",
  });
  assert.equal("error" in next, false);
  if ("error" in next) return;
  assert.equal(next.segmentId, "energy");
  assert.equal(next.segmentSource, "hunter");
  assert.equal(signedSegment(next).id, "energy");
  assert.equal(next.switches.length, 1);
  assert.equal(next.switches[0]?.from, "tech");
  assert.equal(next.switches[0]?.to, "energy");
  assert.match(next.planNote, /2026-11-24T17:47:00.000Z/);
  assert.match(next.planNote, /from tech to energy/);
  assert.match(next.planNote, /Energy replies converted/);
  assert.deepEqual(next.weights, state.weights);
  const same = applyHunterSegment(next, {
    segmentId: "energy",
    reason: "Energy replies converted more often than technology.",
    today: "2026-11-24",
    at: "2026-11-24T18:00:00.000Z",
  });
  assert.equal("error" in same, false);
  if ("error" in same) return;
  assert.equal(same.switches.length, 1);
});

test("every fourth week suggests the least-tested segment", () => {
  let weekStart = "";
  for (let n = 0; n < 40; n += 1) {
    const date = new Date(Date.UTC(2026, 0, 5 + n * 7));
    const iso = date.toISOString().slice(0, 10);
    const weekIndex = Math.floor(Date.parse(`${iso}T00:00:00Z`) / (7 * 24 * 60 * 60 * 1000));
    if (weekIndex % 4 === 3) {
      weekStart = iso;
      break;
    }
  }
  const pick = suggestSegment({
    weekStart,
    reviewedBySegment: { tech: 40, energy: 2, professional: 10, healthcare: 8 },
    scoreBySegment: { tech: 9 },
  });
  assert.equal(pick.id, "energy");
  assert.match(pick.reason, /least-tested/);
});

test("ranking keeps a large company and places the sweet spot higher", () => {
  const ranked = rankOrganizations(
    [
      org({ id: "large", domain: "large.example", employees: 400, name: "Large Co" }),
      org({ id: "sweet", domain: "sweet.example", employees: 12, name: "Sweet Co" }),
    ],
    "canada",
    STARTING_WEIGHTS,
    1,
  );
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.id, "sweet");
  assert.equal(ranked[1]?.id, "large");
  assert.match(ranked[1]?.inputs.join(" ") ?? "", /still ranked/);
});

test("the region draw follows 70/30 and a page of known companies advances", () => {
  const draws = Array.from({ length: 10 }, (_, index) => regionForDraw(index, { canada: 70, us: 30 }));
  assert.equal(draws.filter((item) => item === "canada").length, 7);
  assert.equal(draws.filter((item) => item === "us").length, 3);
  const first = acceptPage(freshCampaign("2026-11-20"), "canada", [org()], "2026-11-20");
  assert.equal(first.added, 1);
  const again = acceptPage(first.state, "canada", [org()], "2026-11-20");
  assert.equal(again.added, 0);
  assert.equal(again.seen, 1);
  assert.equal(again.exhausted, false);
  assert.equal(again.state.exhausted.canada, false);
  assert.equal(again.state.nextPage.canada, first.state.nextPage.canada + 1);
  assert.match(pageDropNote(again), /Already seen 1/);
});

test("apollo funding, hiring, and growth are profile signals, and a keyword counts only on the company site", () => {
  const hits = apolloProfileSignals(org(), "2026-11-20");
  assert.equal(hits.every((hit) => hit.via === "Apollo"), true);
  assert.equal(hits.some((hit) => /funding/i.test(hit.snippet)), true);
  assert.equal(hits.some((hit) => /growth|hiring/i.test(hit.snippet)), true);
  const page = "Northwind is an outdoor company.";
  const confirmed = keywordSignalsOnPage(["outdoor"], page, "https://northwind.example");
  assert.equal(confirmed.some((hit) => hit.id === "outdoor"), true);
  assert.equal(keywordSignalsOnPage(["outdoor"], "Northwind builds software.", "https://northwind.example").length, 0);
});

test("buyer titles raise only the companies that have one, and weights wait for 30 reviews", () => {
  const ranked = rankOrganizations([org(), org({ id: "org-2", domain: "plain.example", name: "Plain", jobTitles: [] })], "canada", STARTING_WEIGHTS, 1);
  const boosted = applyBuyerTitleBoost(ranked, { "northwind.example": ["Head of People"] });
  assert.equal(boosted[0]?.domain, "northwind.example");
  assert.match(boosted[0]?.inputs.join(" ") ?? "", /Buyer title/);
  const held = nextWeights(STARTING_WEIGHTS, []);
  assert.equal(held.weights.funding, STARTING_WEIGHTS.funding);
  assert.match(held.note, /No weight change/);
  const rows = Array.from({ length: 30 }, (_, index) => ({
    segmentId: "tech",
    reviewed: true,
    approved: true,
    replied: false,
    booked: index < 15,
    hadFunding: index < 15,
  }));
  const raised = nextWeights(STARTING_WEIGHTS, rows);
  assert.equal(raised.weights.funding, STARTING_WEIGHTS.funding + 5);
  assert.match(raised.note, /without a separate sign-off/);
});

test("the credit alarm names the published allowance and does not invent a stop", () => {
  assert.equal(creditAlarm(10), "");
  assert.match(creditAlarm(2000), /not verified/);
  assert.match(creditAlarm(2000), /2500/);
});

test("an apollo-backed company keeps its place and its apollo signal when the page does not repeat them", () => {
  const draft: HunterDraft = {
    domain: "northwind.example",
    org: "Northwind",
    place: "Calgary, Alberta, Canada",
    industry: "information technology & services",
    sizeBand: "18",
    sourceUrl: "https://northwind.example",
    signals: [],
    profileSignals: [
      ...apolloProfileSignals(org(), "2026-11-20"),
      { id: "distributed", sourceUrl: "https://northwind.example" },
    ],
    apolloBacked: true,
    method: "apollo-campaign",
    buyer: { name: "", title: "", email: "", emailSource: "" },
    keywordTags: ["outdoor"],
  };
  const page = "Northwind builds software at northwind.example and runs a distributed team.";
  const cards = verifyHunterDrafts([draft], { "https://northwind.example": page }, { regionId: "canada", today: "2026-11-20" });
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.place, "Calgary, Alberta, Canada");
  assert.equal(cards[0]?.profileHits.some((hit) => hit.sourceUrl === "Apollo"), true);
  assert.equal(cards[0]?.profileHits.some((hit) => hit.id === "distributed"), true);
  assert.equal(cards[0]?.apolloFields?.includes("place"), true);
  const filed = fileHunterCards([], cards, { today: "2026-11-20", floor: 0 });
  const company = filed.companies.find((item) => item.domain === "northwind.example");
  assert.equal(company?.lineage?.method, "apollo-campaign");
  assert.equal(company?.fieldSources?.place?.via, "Apollo");
  assert.equal(company?.fieldSources?.place?.url, "");
  assert.equal(filed.filed, 1);
});

test("a blank location from a Canada or United States search is kept", () => {
  const blank = readApolloOrganization({ id: "blank-1", name: "No City Co", primary_domain: "nocity.example" }, "United States");
  assert.equal(blank?.country, "United States");
  assert.equal(phaseOneCountry("", "", "canada"), true);
  assert.equal(phaseOneCountry("", "", "us"), true);
  assert.equal(phaseOneCountry("Germany", "Berlin", "canada"), false);
  const accepted = acceptPage(
    freshCampaign("2026-11-20"),
    "canada",
    [
      org({ id: "blank-2", domain: "blank.example", name: "Blank Co", country: "", place: "" }),
      org({ id: "de", domain: "de.example", name: "Berlin Co", country: "Germany", place: "Berlin, Germany" }),
    ],
    "2026-11-20",
  );
  assert.equal(accepted.added, 1);
  assert.equal(accepted.outOfRegion, 1);
  assert.equal(accepted.seen, 0);
  assert.match(pageDropNote(accepted), /Returned 2/);
  assert.match(pageDropNote(accepted), /Outside Canada and the United States 1/);
  const draft: HunterDraft = {
    domain: "blank.example",
    org: "Blank Co",
    place: "",
    industry: "other",
    sizeBand: "unknown",
    sourceUrl: "https://blank.example",
    signals: [],
    profileSignals: [{ id: "distributed", sourceUrl: "https://blank.example" }],
    buyer: { name: "", title: "", email: "", emailSource: "" },
  };
  const cards = verifyHunterDrafts([draft], { "https://blank.example": "Blank Co at blank.example runs a distributed team." }, { regionId: "canada", today: "2026-11-20" });
  assert.equal(cards[0]?.place, "");
  const filed = fileHunterCards([], cards, { today: "2026-11-20", floor: 0 });
  assert.equal(filed.filed, 1);
  assert.equal(filed.drops.outOfRegion, undefined);
});

test("Canadian draws alternate the city queue first, and fifteen percent are the United States", () => {
  const draws = Array.from({ length: 20 }, (_, index) => searchDraw(index, { canada: 85, us: 15 }));
  assert.equal(draws.filter((item) => item.queue === "cities").length, 9);
  assert.equal(draws.filter((item) => item.queue === "canada").length, 8);
  assert.equal(draws.filter((item) => item.queue === "us").length, 3);
  assert.equal(draws[0]?.queue, "cities");
  assert.equal(draws[1]?.queue, "canada");
  assert.deepEqual(draws[0]?.locations, [...THREE_CITY_LOCATIONS]);
  assert.deepEqual(draws[1]?.locations, ["Canada"]);
  assert.deepEqual(draws[17]?.locations, ["United States"]);
  const params = companySearchParams({ locations: draws[0]?.locations, industries: ["information technology & services"], page: 1, perPage: 100 });
  assert.equal(params.has("organization_not_locations[]"), false);
  assert.equal(regionWeightForPlace("Edmonton, Alberta", "canada"), 10);
  assert.equal(regionWeightForPlace("Calgary, Alberta", "canada"), HUNTER_REGION_WEIGHTS.threeCities);
  assert.equal(regionWeightForPlace("Red Deer, Alberta", "canada"), 10);
  assert.equal(regionWeightForPlace("Lethbridge, Alberta", "canada"), 9);
  assert.equal(regionWeightForPlace("Halifax, NS", "canada"), 7);
  assert.equal(regionWeightForPlace("Seattle, WA", "us"), 6);
});

test("an empty Apollo page exhausts the region, and the weekly cap resets on Monday", () => {
  const empty = acceptPage(freshCampaign("2026-11-20"), "us", [], "2026-11-20");
  assert.equal(empty.exhausted, true);
  assert.equal(empty.state.exhausted.us, true);
  let state = freshCampaign("2026-11-20");
  for (let n = 0; n < CAMPAIGN_PAGES_PER_REGION; n += 1) {
    const page = acceptPage(state, "canada", [org({ id: `id-${n}`, domain: `co${n}.example`, name: `Co ${n}` })], "2026-11-20", 50);
    state = page.state;
  }
  assert.equal(state.exhausted.canada, true);
  assert.equal(state.pagesPulled.canada, CAMPAIGN_PAGES_PER_REGION);
  const monday = loadCampaignState(state, "2026-11-23");
  assert.equal(monday.weekStart, "2026-11-23");
  assert.equal(monday.exhausted.canada, false);
  assert.equal(monday.exhausted.cities, false);
  assert.equal(monday.pagesPulled.canada, 0);
  assert.equal(monday.pagesPulled.cities, 0);
  assert.equal(monday.version, CAMPAIGN_STATE_VERSION);
});

test("a stuck exhausted campaign pulls again without a manual edit", () => {
  const stuck = {
    ...freshCampaign("2026-11-20"),
    version: 1,
    exhausted: { cities: true, canada: true, us: true },
    pagesPulled: { cities: CAMPAIGN_PAGES_PER_REGION, canada: CAMPAIGN_PAGES_PER_REGION, us: CAMPAIGN_PAGES_PER_REGION },
    nextPage: { cities: 4, canada: 6, us: 2 },
    seenIds: ["old-id"],
    queued: [],
  };
  const recovered = loadCampaignState(stuck, "2026-11-20");
  assert.equal(recovered.version, CAMPAIGN_STATE_VERSION);
  assert.deepEqual(recovered.seenIds, []);
  assert.deepEqual(recovered.queued, []);
  assert.equal(recovered.nextPage.canada, 1);
  assert.equal(recovered.nextPage.cities, 1);
  assert.equal(recovered.exhausted.canada, false);
  assert.equal(recovered.exhausted.us, false);
  assert.equal(recovered.pagesPulled.canada, 0);
  assert.equal(recovered.pagesPulled.us, 0);
  assert.equal(needsAnotherPage(recovered, "canada"), true);
  assert.equal(needsAnotherPage(recovered, "us"), true);
  assert.equal(recovered.segmentId, "tech");
  const stillCapped = loadCampaignState({ ...stuck, version: CAMPAIGN_STATE_VERSION, exhausted: { cities: false, canada: true, us: false }, pagesPulled: { cities: 0, canada: CAMPAIGN_PAGES_PER_REGION, us: 0 } }, "2026-11-20");
  assert.equal(stillCapped.exhausted.canada, true);
  assert.equal(stillCapped.exhausted.cities, false);
});

test("a stored 70/30 campaign takes the Canada tilt, and the city queue stays separate", () => {
  const stored = {
    ...freshCampaign("2026-11-24"),
    split: { canada: 70, us: 30 },
    splitReason: "No clear lean. The default is 70 percent Canada and 30 percent the United States.",
    nextPage: { canada: 4, us: 2 },
    pagesPulled: { canada: 3, us: 1 },
    exhausted: { canada: false, us: false },
  };
  const loaded = loadCampaignState(stored as unknown, "2026-11-24");
  assert.deepEqual(loaded.split, { canada: 85, us: 15 });
  assert.equal(loaded.splitReason, CANADA_TILT_REASON);
  assert.equal(loaded.nextPage.canada, 4);
  assert.equal(loaded.nextPage.cities, 1);
  assert.equal(loaded.pagesPulled.cities, 0);
  assert.equal(loaded.exhausted.cities, false);
  const custom = loadCampaignState(
    { ...stored, split: { canada: 60, us: 40 }, splitReason: "Hunter set this split." } as unknown,
    "2026-11-24",
  );
  assert.deepEqual(custom.split, { canada: 60, us: 40 });
  assert.equal(custom.splitReason, "Hunter set this split.");
  const national = acceptPage(freshCampaign("2026-11-24"), "canada", [org({ id: "nat", domain: "national.example", name: "National" })], "2026-11-24");
  assert.equal(needsAnotherPage(national.state, "canada"), false);
  assert.equal(needsAnotherPage(national.state, "cities"), true);
  assert.equal(collectRegion(national.state, "cities", new Set(), 4).taken.length, 0);
  assert.equal(collectRegion(national.state, "canada", new Set(), 4).taken.length, 1);
  const cityPage = acceptPage(national.state, "cities", [org({ id: "city", domain: "edmonton.example", name: "Edmonton Co" })], "2026-11-24");
  assert.equal(cityPage.added, 1);
  assert.equal(cityPage.state.nextPage.cities, 2);
  assert.equal(cityPage.state.nextPage.canada, national.state.nextPage.canada);
  assert.equal(cityPage.state.queued.filter((row) => row.queue === "cities").length, 1);
  assert.equal(cityPage.state.queued.find((row) => row.queue === "cities")?.region, "canada");
});

test("staffing, recruiting, job boards, and outsourcing stay out, and large technology companies stay in", () => {
  assert.equal(freshCampaign("2026-11-25").employeeRange, null);
  assert.equal(campaignEmployeeRanges(null), null);
  assert.deepEqual(campaignEmployeeRanges({ min: 21, max: 100 }), ["21,100"]);
  assert.equal(companyBuyerBlock({ name: "Aditi Consulting", industry: "information technology & services" }), null);
  assert.equal(companyBuyerBlock({ name: "Thinking Ape", industry: "information technology & services", employees: 80 }), null);
  assert.equal(companyBuyerBlock({ name: "Applicantz", industry: "staffing" })?.includes("Staffing"), true);
  assert.equal(companyBuyerBlock({ name: "Trillium Information Security Systems", industry: "information security" }), null);
  assert.equal(companyBuyerBlock({ name: "BayOne Solutions", industry: "information technology & services" }), null);
  assert.equal(companyBuyerBlock({ name: "Epic", industry: "software", employees: 12000 }), null);
  assert.equal(companyBuyerBlock({ name: "Google", industry: "information technology & services", employees: 180000 }), null);
  assert.equal(companyBuyerBlock({ name: "Northwind", industry: "oil and energy", employees: 80, keywords: ["outdoor"] }), null);
  assert.equal(companyBuyerBlock({ name: "Desk BPO", industry: "outsourcing", keywords: ["business process outsourcing"] })?.includes("outsourcing"), true);
  const blank = stampSearchIndustry(org({ id: "blank", domain: "blank.example", name: "Blank", industry: "" }), ["information technology & services"]);
  assert.equal(blank.industry, "information technology & services");
  assert.equal(stampSearchIndustry(org({ industry: "software" }), ["information technology & services"]).industry, "software");
  const page = acceptPage(
    freshCampaign("2026-11-25"),
    "cities",
    [
      org({ id: "aditi", domain: "aditi.example", name: "Aditi Consulting", industry: "information technology & services" }),
      org({ id: "keep", domain: "keep.example", name: "Keep Energy", industry: "oil and energy", employees: 80 }),
      org({ id: "google", domain: "google.example", name: "Google", industry: "information technology & services", employees: 180000 }),
    ],
    "2026-11-25",
  );
  assert.equal(page.added, 3);
  assert.equal(page.state.queued.some((row) => row.name === "Aditi Consulting"), true);
  assert.equal(page.state.queued.some((row) => row.name === "Google"), true);
  const stale = collectRegion(page.state, "cities", new Set(), 4);
  const blocked = collectRegion(
    {
      ...freshCampaign("2026-11-25"),
      queued: rankOrganizations(
        [org({ id: "app", domain: "applicantz.example", name: "Applicantz", industry: "staffing & recruiting" })],
        "canada",
        STARTING_WEIGHTS,
        1,
      ),
    },
    "canada",
    new Set(),
    4,
  );
  assert.equal(blocked.taken.length, 0);
  assert.equal(blocked.state.queued[0]?.status, "dropped");
  assert.equal(stale.taken.length, 3);
});
