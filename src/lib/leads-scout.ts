/**
 * Hunter's nightly local sweep.
 * The route and this file keep their old names. Researches public pages for Alberta companies.
 * A public name or email is kept only when that exact text is on the page at emailSource.
 * Apollo enrichment is optional and runs only when the cron passes it in.
 */

import { isPhaseOneCompany } from "../data/hunter-profile.ts";
import { isClearBuyer, judgeBuyerFit } from "./buyer-judgment.ts";
import { assignEnrichment, countContactReadyGain } from "./hunter-cap.ts";
import { markPublicContact } from "./apollo.ts";
import { loadBook, saveBook } from "./leads-book.ts";
import { isSeparateStudio, verifiedHook } from "./hunter-phase.ts";
import {
  coerceCity,
  coerceIndustry,
  coerceSize,
  edmontonToday,
  mergeScoutRows,
  normalizeDomain,
  scoreCompany,
  type Company,
  type ScoutIngest,
} from "./lead-score.ts";

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

/** Keep a sourced row in Canada or the United States. Headcount and industry are not filters. Alberta still scores higher. */
export function selectScoutRows(raw: unknown): ScoutIngest[] {
  const record = asRecord(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(record?.companies) ? record.companies : [];
  const rows: ScoutIngest[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const domain = normalizeDomain(String(row.domain ?? ""));
    const org = String(row.org ?? "").trim();
    if (!domain || seen.has(domain) || isSeparateStudio(domain, org)) continue;
    const located = String(row.place ?? row.city ?? "");
    if (!isPhaseOneCompany({ place: located, city: String(row.city ?? "") })) continue;
    const city = coerceCity(String(row.city ?? ""), "Elsewhere");
    const rawSize = String(row.sizeBand ?? "").trim();
    const sizeBand = rawSize ? coerceSize(rawSize, "unknown") : "unknown";
    const rawIndustry = String(row.industry ?? "").trim();
    const industry = rawIndustry ? coerceIndustry(rawIndustry, "other") : "other";
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
      hook: readScoutHook(asRecord(row.hook)),
    });
  }
  return rows;
}

/** Companies the nightly search returned that are not in Canada or the United States. */
export function scoutOutOfRegion(raw: unknown) {
  const record = asRecord(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(record?.companies) ? record.companies : [];
  const seen = new Set<string>();
  let count = 0;
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const domain = normalizeDomain(String(row.domain ?? ""));
    const org = String(row.org ?? "").trim();
    if (!domain || seen.has(domain) || isSeparateStudio(domain, org)) continue;
    seen.add(domain);
    const located = String(row.place ?? row.city ?? "");
    if (!isPhaseOneCompany({ place: located, city: String(row.city ?? "") })) count += 1;
  }
  return count;
}

export function applyVerifiedContacts(rows: ScoutIngest[], pages: Record<string, string>, today = ""): ScoutIngest[] {
  return rows.map((row) => {
    const pageUrl = row.buyer?.emailSource?.trim() ?? "";
    const page = pageUrl ? pages[pageUrl] : undefined;
    const hookPage = row.hook?.sourceUrl ? pages[row.hook.sourceUrl] : undefined;
    const hook = verifiedHook(row.hook, hookPage ?? "", today);
    if (!page) {
      return { ...row, buyer: { name: "", title: "", email: "", emailSource: "" }, hook };
    }
    const contact = contactIfPresent(page, row.buyer?.name ?? "", row.buyer?.email ?? "", pageUrl);
    return {
      ...row,
      hook,
      buyer: {
        ...contact,
        title: contact.name ? (row.buyer?.title ?? "") : "",
      },
    };
  });
}

function readScoutHook(hook: Record<string, unknown> | null): ScoutIngest["hook"] {
  if (!hook) return undefined;
  const text = String(hook.text ?? "").trim();
  const sourceUrl = String(hook.sourceUrl ?? "").trim();
  const sourceDate = String(hook.sourceDate ?? "").trim();
  const kind = String(hook.kind ?? "").trim();
  if (!text || !sourceUrl || !sourceDate || !kind) return undefined;
  return { text, sourceUrl, sourceDate, kind };
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

export async function researchCompanies(
  knownDomains: string[],
  timeLeft?: () => number,
): Promise<
  | { companies: unknown; attempts: number; dollars: number | null; estimatedDollars: number }
  | { error: string; attempts: number; timedOut?: boolean }
> {
  void knownDomains;
  void timeLeft;
  return { error: "Nightly sweep stopped on 20th November 2026.", attempts: 0 };
}

async function readPublishedPage(url: string, timeoutMs = 6000): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return "";
  const timeout = Math.max(500, Math.min(6000, timeoutMs));
  let last = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "UnearthSelfLeadScout/1.0" },
        signal: AbortSignal.timeout(timeout),
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

export async function verifyRows(rows: ScoutIngest[], timeLeft?: () => number, today = ""): Promise<ScoutIngest[]> {
  const urls = [
    ...new Set(
      rows.flatMap((row) => [row.buyer?.emailSource?.trim() ?? "", row.hook?.sourceUrl?.trim() ?? ""]).filter((url) => /^https?:\/\//i.test(url)),
    ),
  ];
  const pages: Record<string, string> = {};
  if (timeLeft && timeLeft() < 1_000) return applyVerifiedContacts(rows, pages, today);
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      if (timeLeft && timeLeft() < 1_000) return;
      const url = urls[cursor];
      cursor += 1;
      if (!url) continue;
      const timeout = timeLeft ? timeLeft() : 6000;
      if (timeout < 500) return;
      pages[url] = await readPublishedPage(url, timeout);
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, urls.length) }, () => worker()));
  return applyVerifiedContacts(rows, pages, today);
}

export type NightlyEnrichment = (
  companies: Company[],
  domains: string[],
  today: string,
) => Promise<{
  companies: Company[];
  searches: number;
  reveals: number;
  verifiedEmails?: number;
  failures?: Record<string, number>;
  note: string;
  failed?: boolean;
  timedOut?: boolean;
}>;

/** A named contact is filed only when the model calls them a clear buyer. No contact stays a research row. */
async function judgeScoutContacts(rows: ScoutIngest[], timeLeft?: () => number) {
  const kept: ScoutIngest[] = [];
  let notBuyerJudged = 0;
  let judgmentUnavailable = 0;
  for (const row of rows) {
    const role = row.buyer?.title?.trim() ?? "";
    const name = row.buyer?.name?.trim() ?? "";
    if (!role && !name) {
      kept.push(row);
      continue;
    }
    const left = timeLeft ? timeLeft() : 20_000;
    if (left < 1_000) {
      judgmentUnavailable += 1;
      console.info(JSON.stringify({ hunter: "buyer-judgment", outcome: "judgmentUnavailable" }));
      continue;
    }
    const result = await judgeBuyerFit(
      {
        org: row.org ?? "",
        domain: row.domain,
        place: row.city ?? "",
        city: row.city ?? "",
        industry: row.industry ?? "",
        sizeBand: row.sizeBand ?? "",
        signals: "",
        role,
      },
      { timeoutMs: Math.min(20_000, left) },
    );
    if (!result.ok) {
      judgmentUnavailable += 1;
      console.info(JSON.stringify({ hunter: "buyer-judgment", outcome: "judgmentUnavailable" }));
      continue;
    }
    if (!isClearBuyer(result.judgment)) {
      notBuyerJudged += 1;
      console.info(JSON.stringify({ hunter: "buyer-judgment", outcome: "notBuyerJudged", reason: result.judgment.reason }));
      continue;
    }
    console.info(JSON.stringify({ hunter: "buyer-judgment", outcome: "buyer", confidence: result.judgment.confidence, reason: result.judgment.reason }));
    kept.push({ ...row, buyerJudgment: result.judgment, ...(result.fit ? { fitRating: result.fit } : {}) });
  }
  return { rows: kept, notBuyerJudged, judgmentUnavailable };
}

export async function runNightlyScout(opts?: {
  enrich?: NightlyEnrichment;
  now?: Date;
  skip?: (row: { domain: string; email?: string }) => boolean;
  timeLeft?: () => number;
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
      apolloVerified: number;
      apolloFailures: Record<string, number>;
      apolloNote: string;
      attempts: number;
      dollars: number | null;
      estimatedDollars: number;
      apolloFailed: boolean;
      timedOut: boolean;
      outOfRegion: number;
      notBuyerJudged: number;
      judgmentUnavailable: number;
    }
  | { ok: false; error: string; called: boolean; attempts: number; timedOut?: boolean }
> {
  const loaded = await loadBook();
  if (loaded.storage !== "redis") return { ok: false, error: "Redis is not configured", called: false, attempts: 0 };
  const today = edmontonToday(opts?.now);
  let research: Awaited<ReturnType<typeof researchCompanies>>;
  try {
    research = await researchCompanies(loaded.book.companies.map((company) => company.domain), opts?.timeLeft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nightly search failed";
    return { ok: false, error: message, called: true, attempts: 1 };
  }
  if ("error" in research) return { ok: false, error: research.error, called: research.attempts > 0, attempts: research.attempts, timedOut: research.timedOut };
  if (opts?.timeLeft && opts.timeLeft() < 1_000) {
    return { ok: false, error: "Stopped for time.", called: true, attempts: research.attempts, timedOut: true };
  }
  const selected = selectScoutRows(research);
  const outOfRegion = scoutOutOfRegion(research);
  const verified = await verifyRows(selected, opts?.timeLeft, today);
  const open = opts?.skip ? verified.filter((row) => !opts.skip?.({ domain: row.domain, email: row.buyer?.email })) : verified;
  const judged = await judgeScoutContacts(open, opts?.timeLeft);
  const batch = buildMorningBatch(loaded.book.companies, judged.rows, {
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
    : { companies: marked, searches: 0, reveals: 0, note: "", failed: false, timedOut: false };
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
    apolloVerified: enriched.verifiedEmails ?? 0,
    apolloFailures: enriched.failures ?? {},
    apolloNote: enriched.note,
    outOfRegion,
    notBuyerJudged: judged.notBuyerJudged,
    judgmentUnavailable: judged.judgmentUnavailable,
    dollars: research.dollars,
    estimatedDollars: research.estimatedDollars,
    apolloFailed: Boolean(enriched.failed),
    timedOut: Boolean(enriched.timedOut) || Boolean(opts?.timeLeft && opts.timeLeft() < 1_000),
  };
}
