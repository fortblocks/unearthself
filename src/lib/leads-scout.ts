/**
 * Hunter's nightly local sweep.
 * The route and this file keep their old names. Researches public pages for Alberta companies.
 * A public name or email is kept only when that exact text is on the page at emailSource.
 * Apollo enrichment is optional and runs only when the cron passes it in.
 */

import { assignEnrichment, countContactReadyGain } from "./hunter-cap.ts";
import { markPublicContact } from "./apollo.ts";
import { loadBook, saveBook } from "./leads-book.ts";
import {
  FIRST_WAVE,
  coerceCity,
  coerceIndustry,
  coerceSize,
  edmontonToday,
  mergeScoutRows,
  normalizeDomain,
  scoreCompany,
  type Company,
  type Industry,
  type ScoutIngest,
} from "./lead-score.ts";

const TARGET_CITIES = new Set(["Calgary", "Edmonton", "Red Deer"]);

export function contactIfPresent(
  pageText: string,
  name: string,
  email: string,
  pageUrl: string,
): { name: string; title: string; email: string; emailSource: string } {
  const blank = { name: "", title: "", email: "", emailSource: "" };
  if (!/^https?:\/\//i.test(pageUrl.trim())) return blank;
  const hay = pageText.toLowerCase();
  const mail = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) && hay.includes(mail);
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length >= 2);
  const nameOk = tokens.length >= 2 && tokens.every((part) => hay.includes(part.toLowerCase()));
  if (!emailOk && !nameOk) return blank;
  return {
    name: nameOk ? name.trim() : "",
    title: "",
    email: emailOk ? mail : "",
    emailSource: pageUrl.trim(),
  };
}

function asRecord(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== "object") return null;
  return row as Record<string, unknown>;
}

/** Keep only in-wave Alberta rows the model actually sourced. */
export function selectScoutRows(raw: unknown): ScoutIngest[] {
  const record = asRecord(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(record?.companies) ? record.companies : [];
  const rows: ScoutIngest[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const domain = normalizeDomain(String(row.domain ?? ""));
    if (!domain || seen.has(domain)) continue;
    const city = coerceCity(String(row.city ?? ""), "Alberta");
    if (!TARGET_CITIES.has(city)) continue;
    if (!row.sizeBand) continue;
    const sizeBand = coerceSize(String(row.sizeBand), "1-49");
    if (sizeBand !== "80-800") continue;
    if (!row.industry) continue;
    const industry = coerceIndustry(String(row.industry), "other");
    if (!FIRST_WAVE.includes(industry as Industry)) continue;
    const sourceUrl = String(row.sourceUrl ?? "").trim();
    if (!/^https?:\/\//i.test(sourceUrl)) continue;
    const buyer = asRecord(row.buyer);
    seen.add(domain);
    rows.push({
      domain,
      org: String(row.org ?? "").trim(),
      city,
      industry,
      sizeBand,
      sourceUrl,
      why: String(row.why ?? "").trim(),
      whySources: row.whySources,
      signals: row.signals,
      buyer: buyer
        ? {
            name: String(buyer.name ?? "").trim(),
            title: String(buyer.title ?? "").trim(),
            email: String(buyer.email ?? "").trim(),
            emailSource: String(buyer.emailSource ?? "").trim(),
          }
        : undefined,
    });
  }
  return rows;
}

export function applyVerifiedContacts(rows: ScoutIngest[], pages: Record<string, string>): ScoutIngest[] {
  return rows.map((row) => {
    const pageUrl = row.buyer?.emailSource?.trim() ?? "";
    const page = pageUrl ? pages[pageUrl] : undefined;
    if (!page) {
      return { ...row, buyer: { name: "", title: "", email: "", emailSource: "" } };
    }
    const contact = contactIfPresent(page, row.buyer?.name ?? "", row.buyer?.email ?? "", pageUrl);
    return {
      ...row,
      buyer: {
        ...contact,
        title: contact.name ? (row.buyer?.title ?? "") : "",
      },
    };
  });
}

/**
 * New domains only. Existing cards stay put.
 * The morning batch is the top `limit` new cards by score.
 */
export function buildMorningBatch(
  existing: Company[],
  rows: ScoutIngest[],
  opts: { today: string; limit: number },
): { companies: Company[]; morningIds: string[]; added: number } {
  const known = new Set(existing.map((company) => company.domain));
  const fresh = rows.filter((row) => !known.has(normalizeDomain(row.domain)));
  const merged = mergeScoutRows(existing, fresh, { batch: opts.today, today: opts.today });
  const added = merged.companies.filter(
    (company) => company.scoutBatch === opts.today && !existing.some((prior) => prior.id === company.id),
  );
  const ranked = [...added].sort((a, b) => {
    const diff =
      scoreCompany({ ...b, today: opts.today }).total - scoreCompany({ ...a, today: opts.today }).total;
    return diff || a.org.localeCompare(b.org);
  });
  return {
    companies: merged.companies,
    morningIds: ranked.slice(0, opts.limit).map((company) => company.id),
    added: ranked.length,
  };
}

export function scoutPrompt(knownDomains: string[]): string {
  const skip = knownDomains.slice(0, 200).join(", ");
  return `Find Alberta companies for a corporate retreat in Drumheller. Return JSON only.

Cities: Calgary, Edmonton, Red Deer.
Headcount: 80 to 800.
Industries: energy, construction, professional services, healthcare, engineering, logistics, education, civic.
Skip these domains: ${skip || "none"}.

For each company include org, domain, city, industry, sizeBand ("80-800"), sourceUrl, why, whySources (url and label), signals, and buyer.

Signals are public dated events only: hiring, office, expansion, win, year-end. Each signal needs kind, date as YYYY-MM-DD, sourceUrl, and a short note. Omit a signal when you do not have both a date and a page URL.

buyer.name, buyer.title, buyer.email, and buyer.emailSource: include a name or email only when that exact text is published on buyer.emailSource. If you cannot point at the page, leave the buyer fields as empty strings. A blank buyer is still a company to return. Never guess an email. Never use a pattern such as first.last@.

why is two or three sentences on why the company fits, and whySources lists the pages you used.

Return at most 15 companies. Return a company when you have its name, domain, and a page URL, even if the buyer or a signal is blank. Use an empty companies array only when the search found no organisation.
{ "companies": [] }`;
}

export async function researchCompanies(
  knownDomains: string[],
): Promise<{ companies: unknown; attempts: number } | { error: string; attempts: number }> {
  const { searchWithRetries } = await import("./xai-search.ts");
  const { monthlyCapState, reserveCounter, callCounterKey, spendCounterKey, spendUnknownKey } = await import("./hunter-phase.ts");
  const { hunterCallBudget } = await import("./hunter-cap.ts");
  const { hunterMaxRetries } = await import("./hunter-config.ts");
  const { getRedisClient } = await import("./leads-book.ts");
  const { edmontonToday } = await import("./lead-score.ts");
  const redis = await getRedisClient();
  if (!redis) return { error: "Redis is not configured", attempts: 0 };
  const today = edmontonToday();
  const month = today.slice(0, 7);
  const spendUnknown = await redis.get<string>(spendUnknownKey(month));
  const spentRaw = Number(await redis.get<string>(spendCounterKey(month)));
  const spent = spendUnknown || !Number.isFinite(spentRaw) ? null : spentRaw / 100;
  if (monthlyCapState(spent) === "stop") return { error: "Monthly dollar cap reached.", attempts: 0 };
  const budget = hunterCallBudget();
  return searchWithRetries({
    system: "You research public web pages and return JSON. You never invent names, emails, dates, or companies. Every claim needs a source URL.",
    prompt: scoutPrompt(knownDomains),
    timeoutMs: 90000,
    maxRetries: hunterMaxRetries(),
    beforeAttempt: async () => {
      const reserved = await reserveCounter(redis, callCounterKey(today), budget);
      return { allowed: reserved.allowed };
    },
  });
}

async function readPublishedPage(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return "";
  let last = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "UnearthSelfLeadScout/1.0" },
        signal: AbortSignal.timeout(6000),
        redirect: "follow",
      });
      if (response.ok) return await response.text();
      if (response.status === 401 || response.status === 403 || response.status === 429) return "";
      last = "";
    } catch {
      last = "";
    }
  }
  return last;
}

export async function verifyRows(rows: ScoutIngest[]): Promise<ScoutIngest[]> {
  const urls = [...new Set(rows.map((row) => row.buyer?.emailSource?.trim() ?? "").filter((url) => /^https?:\/\//i.test(url)))];
  const pages: Record<string, string> = {};
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;
      if (!url) continue;
      pages[url] = await readPublishedPage(url);
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, urls.length) }, () => worker()));
  return applyVerifiedContacts(rows, pages);
}

export type NightlyEnrichment = (
  companies: Company[],
  domains: string[],
  today: string,
) => Promise<{ companies: Company[]; searches: number; reveals: number; note: string }>;

export async function runNightlyScout(opts?: {
  enrich?: NightlyEnrichment;
  now?: Date;
  skip?: (row: { domain: string; email?: string }) => boolean;
}): Promise<
  | {
      ok: true;
      date: string;
      stored: number;
      considered: number;
      candidates: number;
      called: true;
      contactReady: number;
      apolloSearches: number;
      apolloReveals: number;
      apolloNote: string;
      attempts: number;
    }
  | { ok: false; error: string; called: boolean; attempts: number }
> {
  const loaded = await loadBook();
  if (loaded.storage !== "redis") return { ok: false, error: "Redis is not configured", called: false, attempts: 0 };
  const today = edmontonToday(opts?.now);
  let research: { companies: unknown; attempts: number } | { error: string; attempts: number };
  try {
    research = await researchCompanies(loaded.book.companies.map((company) => company.domain));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nightly search failed";
    return { ok: false, error: message, called: true, attempts: 1 };
  }
  if ("error" in research) return { ok: false, error: research.error, called: research.attempts > 0, attempts: research.attempts };
  const selected = selectScoutRows(research);
  const verified = await verifyRows(selected);
  const open = opts?.skip ? verified.filter((row) => !opts.skip?.({ domain: row.domain, email: row.buyer?.email })) : verified;
  const batch = buildMorningBatch(loaded.book.companies, open, {
    today,
    limit: loaded.book.morningCount,
  });
  const priorIds = new Set(loaded.book.companies.map((company) => company.id));
  const marked = batch.companies.map((company) => {
    const next = priorIds.has(company.id) ? company : assignEnrichment(company, today);
    return markPublicContact(next, today);
  });
  const domains = verified.map((row) => row.domain);
  const enriched = opts?.enrich
    ? await opts.enrich(marked, domains, today)
    : { companies: marked, searches: 0, reveals: 0, note: "" };
  const contactReady = countContactReadyGain(loaded.book.companies, enriched.companies);
  await saveBook({
    ...loaded.book,
    companies: enriched.companies,
    morning: { date: today, ids: batch.morningIds },
  });
  return {
    ok: true,
    date: today,
    stored: batch.morningIds.length,
    considered: batch.added,
    candidates: selected.length,
    called: true,
    attempts: research.attempts,
    contactReady,
    apolloSearches: enriched.searches,
    apolloReveals: enriched.reveals,
    apolloNote: enriched.note,
  };
}
