import assert from "node:assert/strict";
import test from "node:test";
import type { ApolloOrganization } from "./apollo.ts";
import {
  acceptPage,
  applyBuyerTitleBoost,
  apolloProfileSignals,
  companySource,
  creditAlarm,
  freshCampaign,
  keywordSignalsOnPage,
  nextWeights,
  rankOrganizations,
  regionForDraw,
  signOffSuggestion,
  signedSegment,
  STARTING_WEIGHTS,
  suggestSegment,
  withMondaySuggestion,
} from "./hunter-campaign.ts";
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
  assert.deepEqual(state.split, { canada: 70, us: 30 });
  assert.match(state.planNote, /20th November 2026/);
  assert.match(state.splitReason, /No clear lean/);
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

test("the region draw follows 70/30 and a page of known companies stops further pulls", () => {
  const draws = Array.from({ length: 10 }, (_, index) => regionForDraw(index, { canada: 70, us: 30 }));
  assert.equal(draws.filter((item) => item === "canada").length, 7);
  assert.equal(draws.filter((item) => item === "us").length, 3);
  const first = acceptPage(freshCampaign("2026-11-20"), "canada", [org()], "2026-11-20");
  assert.equal(first.added, 1);
  const again = acceptPage(first.state, "canada", [org()], "2026-11-20");
  assert.equal(again.added, 0);
  assert.equal(again.stopPulls, true);
  assert.equal(again.state.exhausted.canada, true);
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
