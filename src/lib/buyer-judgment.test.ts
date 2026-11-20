import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUYER_JUDGMENT_MODEL, BUYER_JUDGMENT_SYSTEM, buyerJudgmentPrompt, isClearBuyer, judgeBuyerFit, parseBuyerJudgment, useBuyerJudgeForTests } from "./buyer-judgment.ts";
import { fileHunterCards, stampCard, verifyHunterDrafts, type HunterDraft } from "./leads-hunter.ts";
import { HUNTER_SEARCH_MODEL } from "./xai-search.ts";

const source = "https://soft.example/about";

function draft(title: string, name: string): HunterDraft {
  return {
    domain: "soft.example",
    org: "Soft Co",
    place: "Calgary, Canada",
    industry: "tech",
    sizeBand: "80-800",
    sourceUrl: source,
    signals: [],
    profileSignals: [{ id: "distributed", sourceUrl: source }],
    buyer: { name, title, email: "sam@soft.example", emailSource: source },
  };
}

function cardFor(title: string) {
  const page = `Soft Co in Calgary, Canada. soft.example. We run a distributed team. ${title}. Sam Lee. sam@soft.example.`;
  const [card] = verifyHunterDrafts([draft(title, "Sam Lee")], { [source]: page }, { regionId: "canada", today: "2026-11-20" });
  if (!card) throw new Error("card missing");
  return card;
}

test("a clear buyer is filed and the reason is stored", () => {
  const card = cardFor("Software Engineer");
  assert.equal(card.buyerTitle, "Software Engineer");
  const reason = "The company runs a travelling team, and this role owns that spend.";
  const filed = fileHunterCards(
    [],
    [
      {
        ...card,
        buyerJudgment: { buyer: true, confidence: "high", reason, model: BUYER_JUDGMENT_MODEL },
      },
    ],
    { today: "2026-11-20", floor: 0, pages: { [source]: `Soft Co. Sam Lee, Software Engineer, sam@soft.example.` } },
  );
  assert.equal(filed.filed, 1);
  assert.equal(filed.drops.notBuyerJudged ?? 0, 0);
  assert.equal(filed.companies[0]?.buyerJudgment?.reason, reason);
  assert.equal(filed.companies[0]?.buyerJudgment?.buyer, true);
  const stamped = stampCard(filed.companies[0]!, [card], { [source]: "Soft Co. Sam Lee, Software Engineer, sam@soft.example." }, "2026-11-20");
  assert.equal(stamped.casl?.roleFit, true);
});

test("a contact the model rejects is skipped and counted, and the book is not rewritten", () => {
  const card = cardFor("Head of People");
  const stored = {
    id: "C-keep",
    org: "Keep Co",
    domain: "keep.example",
    city: "Calgary" as const,
    industry: "energy" as const,
    sizeBand: "80-800" as const,
    sourceUrl: "https://keep.example/about",
    why: "Keep this.",
    buyerName: "Ada North",
    buyerTitle: "People Lead",
    email: "ada@keep.example",
    emailSource: "https://keep.example/about",
    timingNote: "",
    timingScore: 0,
    status: "watch" as const,
    filedLeadId: "",
    draftSubject: "",
    draftBody: "",
    lastTouch: "",
    scoutBatch: "",
  };
  const book = [stored];
  const filed = fileHunterCards(
    book,
    [
      {
        ...card,
        buyerJudgment: {
          buyer: false,
          confidence: "high",
          reason: "The role does not buy team retreats for this company.",
          model: BUYER_JUDGMENT_MODEL,
        },
      },
    ],
    { today: "2026-11-20", floor: 0 },
  );
  assert.equal(filed.filed, 0);
  assert.equal(filed.drops.notBuyerJudged, 1);
  assert.equal(filed.companies.length, 1);
  assert.equal(filed.companies[0], stored);
  assert.equal(book.length, 1);
  assert.equal(stored.org, "Keep Co");
  assert.equal(stored.buyerTitle, "People Lead");
});

test("a failed judgement does not file", () => {
  const card = cardFor("Office Manager");
  const filed = fileHunterCards([], [{ ...card, buyerJudgment: "unavailable" }], { today: "2026-11-20", floor: 0 });
  assert.equal(filed.filed, 0);
  assert.equal(filed.companies.length, 0);
  assert.equal(filed.drops.judgmentUnavailable, 1);
  assert.equal(filed.drops.notBuyerJudged ?? 0, 0);
  const missing = fileHunterCards([], [card], { today: "2026-11-20", floor: 0 });
  assert.equal(missing.filed, 0);
  assert.equal(missing.drops.judgmentUnavailable, 1);
});

test("no enumerated title allow-list gates filing", () => {
  const engineer = cardFor("Software Engineer");
  const people = cardFor("Head of People");
  const yes = fileHunterCards(
    [],
    [
      {
        ...engineer,
        buyerJudgment: {
          buyer: true,
          confidence: "medium",
          reason: "This role buys the team retreat for a company of this size.",
          model: BUYER_JUDGMENT_MODEL,
        },
      },
    ],
    { today: "2026-11-20", floor: 0 },
  );
  const no = fileHunterCards(
    [],
    [
      {
        ...people,
        buyerJudgment: {
          buyer: false,
          confidence: "medium",
          reason: "This role does not buy a team retreat here.",
          model: BUYER_JUDGMENT_MODEL,
        },
      },
    ],
    { today: "2026-11-20", floor: 0 },
  );
  assert.equal(yes.filed, 1);
  assert.equal(yes.companies[0]?.buyerTitle, "Software Engineer");
  assert.equal(no.filed, 0);
  assert.equal(no.drops.notBuyerJudged, 1);

  const sourceText = readFileSync(new URL("./leads-hunter.ts", import.meta.url), "utf8");
  const start = sourceText.indexOf("export function fileHunterCards");
  const end = sourceText.indexOf("export function domainsForPrompt");
  const filing = sourceText.slice(start, end);
  assert.equal(filing.includes("BUYER_ROLE_TITLES"), false);
  assert.equal(filing.includes("titleFitsBuyerRole"), false);
  assert.equal(filing.includes("office manager"), false);
  assert.equal(filing.includes("HUNTER_OFFICE_MANAGER"), false);
  assert.equal(/Head of People|Chief People Officer|people and culture lead/.test(filing), false);

  const judge = readFileSync(new URL("./buyer-judgment.ts", import.meta.url), "utf8");
  assert.equal(judge.includes("BUYER_ROLE_TITLES"), false);
  assert.equal(judge.includes("titleFitsBuyerRole"), false);
  assert.equal(judge.includes("office manager"), false);
  assert.match(BUYER_JUDGMENT_SYSTEM, /no fixed list of job titles/i);
  assert.match(buyerJudgmentPrompt({
    org: "Soft Co",
    domain: "soft.example",
    place: "Calgary, Canada",
    city: "Calgary",
    industry: "tech",
    sizeBand: "80-800",
    signals: "hiring",
    role: "Software Engineer",
  }), /Do not use a fixed title list/);
});

test("the judgement call uses Hunter's Grok model and fails closed", async () => {
  useBuyerJudgeForTests(null);
  const previous = globalThis.fetch;
  const key = process.env.XAI_API_KEY;
  process.env.XAI_API_KEY = "xai-test-key";
  const input = {
    org: "Soft Co",
    domain: "soft.example",
    place: "Calgary, Canada",
    city: "Calgary",
    industry: "tech",
    sizeBand: "80-800",
    signals: "hiring",
    role: "Software Engineer",
  };
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, HUNTER_SEARCH_MODEL);
      assert.equal(body.model, BUYER_JUDGMENT_MODEL);
      assert.equal(body.tools, undefined);
      assert.match(String(body.input[0].content), /Drumheller, Alberta/);
      return Response.json({
        output_text: JSON.stringify({
          buyer: true,
          confidence: "high",
          reason: "The company runs a travelling team, and this role owns that spend.",
        }),
        usage: { input_tokens: 2, output_tokens: 3, cost_in_usd_ticks: 0 },
      });
    };
    const yes = await judgeBuyerFit(input, { timeoutMs: 1000 });
    assert.equal(yes.ok, true);
    if (yes.ok) assert.equal(yes.judgment.confidence, "high");

    globalThis.fetch = async () => {
      const error = new Error("timed out");
      error.name = "TimeoutError";
      throw error;
    };
    const timedOut = await judgeBuyerFit(input, { timeoutMs: 1000 });
    assert.equal(timedOut.ok, false);

    globalThis.fetch = async () => Response.json({ output_text: "{\"companies\":[]}" });
    const garbled = await judgeBuyerFit(input, { timeoutMs: 1000 });
    assert.equal(garbled.ok, false);
    assert.equal(parseBuyerJudgment({ buyer: "yes", confidence: "high", reason: "No." }), null);
    assert.equal(isClearBuyer({ buyer: true, confidence: "low" }), false);
  } finally {
    globalThis.fetch = previous;
    if (key == null) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = key;
    useBuyerJudgeForTests(null);
  }
});
