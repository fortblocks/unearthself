/**
 * Dry run. The default uses fictional fixtures and the real verify and file code.
 * It files nothing to the book. `--live` may spend one model call when XAI_API_KEY is set.
 * Live mode verifies and scores. It never files and never sends.
 */

import { HUNTER_SEARCH_MODEL } from "./xai-search.ts";
import { hunterQualityFloor } from "./hunter-config.ts";
import { addDrop, emptyFunnel, HUNTER_KNOWN_BAD, HUNTER_KNOWN_GOOD, HUNTER_LIVE_LIST, type DryCompany, type DncEntry } from "./hunter-phase.ts";
import { fileHunterCards, readPages, selectHunterRows, urlsForDrafts, verifyHunterDrafts, type HunterDraft } from "./leads-hunter.ts";

export function fixtureDraft(row: DryCompany): HunterDraft {
  const claimed = row.page.toLowerCase().includes("outdoor") ? [{ id: "outdoor", sourceUrl: row.sourceUrl }] : [];
  return {
    domain: row.domain,
    org: row.org,
    place: "",
    industry: "other",
    sizeBand: "unknown",
    sourceUrl: row.sourceUrl,
    signals: [],
    profileSignals: claimed,
    buyer: {
      name: row.email ? "Ada North" : "",
      title: row.email ? "Head of People" : "",
      email: row.email,
      emailSource: row.email ? row.sourceUrl : "",
    },
  };
}

export function dryRunFixtures(floor: number, dnc: DncEntry[] = [], today = "2026-11-19") {
  const funnel = emptyFunnel();
  const held: string[] = [];
  const rows = [...HUNTER_KNOWN_GOOD, ...HUNTER_KNOWN_BAD];
  const drafts: HunterDraft[] = [];
  const pages: Record<string, string> = {};
  funnel.searched = rows.length;
  for (const row of rows) {
    funnel.candidates += 1;
    if (!row.page.trim()) {
      addDrop(funnel, "page-empty");
      held.push(row.domain);
      continue;
    }
    drafts.push(fixtureDraft(row));
    pages[row.sourceUrl] = row.page;
  }
  const verified = verifyHunterDrafts(drafts, pages, { regionId: "anywhere", today });
  const cards = verified.map((card) =>
    card.buyerName.trim() || card.buyerTitle.trim()
      ? {
          ...card,
          buyerJudgment: {
            buyer: true as const,
            confidence: "high" as const,
            reason: "The company context and the role fit a team retreat.",
            model: HUNTER_SEARCH_MODEL,
          },
        }
      : card,
  );
  funnel.verified = cards.length;
  const filed = fileHunterCards([], cards, { today, floor, dnc, pages });
  funnel.contactFound = filed.companies.filter((company) => company.email).length;
  funnel.filed = filed.filed;
  for (const [reason, count] of Object.entries(filed.drops)) {
    for (let n = 0; n < count; n += 1) addDrop(funnel, reason as "duplicate");
  }
  return { ...funnel, held, companies: filed.companies };
}

const live = process.argv.includes("--live");
const invoked = process.argv[1]?.includes("hunter-dry-run");

if (invoked && !live) {
  const funnel = dryRunFixtures(hunterQualityFloor());
  console.log(JSON.stringify({ mode: "fixtures", liveList: HUNTER_LIVE_LIST.length, filed: false, funnel }, null, 2));
} else if (invoked && !process.env.XAI_API_KEY?.trim()) {
  console.log(JSON.stringify({ mode: "live", filed: false, searched: false, note: "XAI_API_KEY is not set. No search was made." }));
} else if (invoked) {
  const { callXaiWebSearch } = await import("./xai-search.ts");
  const { hunterPrompt, slotAt } = await import("./leads-hunter.ts");
  const { slot } = slotAt(0);
  const result = await callXaiWebSearch(
    "You research public web pages and return JSON. You never invent names, emails, dates, or companies. Every claim needs a source URL. This search is only for Unearth Self.",
    hunterPrompt(slot, []),
    90_000,
  );
  if ("error" in result) {
    console.log(JSON.stringify({ mode: "live", filed: false, searched: false, companies: 0, error: result.error }, null, 2));
  } else {
    const drafts = selectHunterRows(result);
    const fetched = await readPages(urlsForDrafts(drafts));
    const pages: Record<string, string> = {};
    for (const [url, page] of Object.entries(fetched)) pages[url] = page.text;
    const cards = verifyHunterDrafts(drafts, pages, { regionId: slot.regionId, today: new Date().toISOString().slice(0, 10) });
    console.log(
      JSON.stringify(
        {
          mode: "live",
          filed: false,
          searched: true,
          companies: drafts.length,
          verified: cards.length,
          scores: cards.map((card) => ({ org: card.org, score: card.hunterScore, hits: card.profileHits.length })),
          error: "",
        },
        null,
        2,
      ),
    );
  }
}
