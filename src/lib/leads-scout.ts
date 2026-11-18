/**
 * Hunter's nightly local sweep.
 * The route and this file keep their old names. Researches public pages for Alberta companies.
 * Does not call Apollo or Clay. A name or email is kept only when that exact text is on the page at emailSource.
 */

import { assignEnrichment, countContactReadyGain } from "./hunter-cap.ts";
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

buyer.name, buyer.title, buyer.email, and buyer.emailSource: include a name or email only when that exact text is published on buyer.emailSource. If you cannot point at the page, leave the buyer fields as empty strings. Never guess an email. Never use a pattern such as first.last@.

why is two or three sentences on why the company fits, and whySources lists the pages you used.

Return at most 15 companies:
{ "companies": [] }`;
}

export async function researchCompanies(knownDomains: string[]): Promise<{ companies: unknown } | { error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { error: "XAI_API_KEY not configured" };
  const { XAI_MODEL } = await import("./structured-minutes.ts");
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You research public web pages and return JSON. You never invent names, emails, dates, or companies. Every claim needs a source URL.",
        },
        { role: "user", content: scoutPrompt(knownDomains) },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      search_parameters: {
        mode: "on",
        return_citations: true,
        sources: [{ type: "web" }],
      },
    }),
    signal: AbortSignal.timeout(70000),
  });
  if (!response.ok) {
    const detail = await response.text();
    return { error: `xAI HTTP ${response.status}: ${detail.slice(0, 400)}` };
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return { error: "xAI returned no content" };
  try {
    return JSON.parse(content) as { companies: unknown };
  } catch {
    return { error: "xAI did not return JSON" };
  }
}

async function readPublishedPage(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return "";
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "UnearthSelfLeadScout/1.0" },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });
    return response.ok ? await response.text() : "";
  } catch {
    return "";
  }
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

export async function runNightlyScout(): Promise<
  | { ok: true; date: string; stored: number; considered: number; called: true; contactReady: number }
  | { ok: false; error: string; called: boolean }
> {
  const loaded = await loadBook();
  if (loaded.storage !== "redis") return { ok: false, error: "Redis is not configured", called: false };
  const today = edmontonToday();
  let research: { companies: unknown } | { error: string };
  try {
    research = await researchCompanies(loaded.book.companies.map((company) => company.domain));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nightly search failed";
    return { ok: false, error: message, called: true };
  }
  if ("error" in research) return { ok: false, error: research.error, called: true };
  const selected = selectScoutRows(research);
  const verified = await verifyRows(selected);
  const batch = buildMorningBatch(loaded.book.companies, verified, {
    today,
    limit: loaded.book.morningCount,
  });
  const priorIds = new Set(loaded.book.companies.map((company) => company.id));
  const companies = batch.companies.map((company) =>
    priorIds.has(company.id) ? company : assignEnrichment(company, today),
  );
  const contactReady = countContactReadyGain(loaded.book.companies, companies);
  await saveBook({
    ...loaded.book,
    companies,
    morning: { date: today, ids: batch.morningIds },
  });
  return { ok: true, date: today, stored: batch.morningIds.length, considered: batch.added, called: true, contactReady };
}
