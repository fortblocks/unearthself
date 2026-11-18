/**
 * Apollo is Hunter's licensed contact source.
 * The key stays in the x-api-key header. It is never put in a URL and never logged.
 * Search is free. One people match reveals one contact and counts against the daily ceiling.
 * Phone numbers are never requested. Waterfall enrichment stays off.
 */

import { assignEnrichment, hasBuyerContact } from "./hunter-cap.ts";
import { normalizeDomain, scoreCompany, type Company } from "./lead-score.ts";

export const APOLLO_DAILY_CREDIT_CAP_DEFAULT = 48;
export const APOLLO_OFF = "Apollo off: no key";
export const APOLLO_CEILING = "Apollo reveal ceiling reached";
export const APOLLO_EMAIL_NOT_VERIFIED = "Apollo email not verified";
export const APOLLO_STALE = "Stale";
export const APOLLO_SOURCE = "Apollo";

const APOLLO_ORIGIN = "https://api.apollo.io/api/v1";

/** Decision-makers for a team of six to twenty-four. Similar titles are requested as well. */
export const APOLLO_TARGET_TITLES = [
  "marketing director",
  "sales director",
  "hr director",
  "people director",
  "people and culture lead",
  "head of people",
  "office manager",
  "operations manager",
  "executive assistant to the CEO",
  "chief people officer",
  "head of culture",
  "director of people and culture",
];

export type ApolloFetch = (url: string, init: RequestInit) => Promise<Response>;

export type ApolloReveal = {
  id: string;
  name: string;
  title: string;
  email: string;
  emailStatus: string;
  updatedOn: string;
  organizationName: string;
  organizationDomain: string;
};

export function apolloApiKey(raw?: string | null) {
  const key = (raw ?? process.env.APOLLO_API_KEY ?? "").trim();
  return key || null;
}

export function apolloCreditCap(raw?: string | null) {
  const text = (raw ?? process.env.APOLLO_DAILY_CREDIT_CAP ?? "").trim();
  if (!text) return APOLLO_DAILY_CREDIT_CAP_DEFAULT;
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0) return APOLLO_DAILY_CREDIT_CAP_DEFAULT;
  return n;
}

export function apolloSearchParams(input: { domain: string; org: string }) {
  const params = new URLSearchParams();
  for (const title of APOLLO_TARGET_TITLES) params.append("person_titles[]", title);
  params.set("include_similar_titles", "true");
  params.set("page", "1");
  params.set("per_page", "10");
  const domain = normalizeDomain(input.domain);
  if (domain) params.append("q_organization_domains_list[]", domain);
  else if (input.org.trim()) params.set("q_keywords", input.org.trim());
  return params;
}

export function apolloRevealParams(personId: string) {
  const params = new URLSearchParams();
  params.set("id", personId);
  params.set("reveal_personal_emails", "false");
  params.set("reveal_phone_number", "false");
  params.set("run_waterfall_email", "false");
  params.set("run_waterfall_phone", "false");
  return params;
}

export function apolloRequestUrl(path: "mixed_people/api_search" | "people/match", params: URLSearchParams) {
  return `${APOLLO_ORIGIN}/${path}?${params.toString()}`;
}

export function redactSecrets(text: string, secrets: string[]) {
  let out = text;
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join("[redacted]");
  }
  return out.replace(/x-api-key["'\s:=]+[^\s"',}]+/gi, "x-api-key [redacted]");
}

export function normalizeEmailStatus(status: string) {
  return status.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/** Only Apollo's verified status may become the card email. */
export function apolloEmailIsVerified(status: string) {
  return normalizeEmailStatus(status) === "verified";
}

function compactOrg(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|ltd|llc|corp|co|company|limited|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function apolloEmployerMatches(
  company: { org: string; domain: string },
  person: { organizationName: string; organizationDomain: string },
) {
  const companyDomain = normalizeDomain(company.domain);
  const personDomain = normalizeDomain(person.organizationDomain);
  if (companyDomain && personDomain) return companyDomain === personDomain;
  const left = compactOrg(company.org);
  const right = compactOrg(person.organizationName);
  if (left && right) return left === right;
  return true;
}

/** True when the Apollo date is more than 12 months before the Edmonton day. */
export function apolloDateIsStale(updatedOn: string, today: string) {
  const stamp = Date.parse(updatedOn);
  const todayStamp = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(stamp) || !Number.isFinite(todayStamp)) return false;
  const cutoff = new Date(todayStamp);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12);
  return stamp < cutoff.getTime();
}

export function needsApolloContact(company: Company) {
  if (hasBuyerContact(company)) return false;
  if (company.apolloPersonId?.trim()) return false;
  if (company.apolloCheckedOn) return false;
  return true;
}

export function markPublicContact<T extends Company>(company: T, today: string): T {
  if (company.contactSource === "Apollo" || company.contactSource === "Public page") return company;
  if (!hasBuyerContact(company)) return company;
  return { ...company, contactSource: "Public page", contactRetrievedOn: company.contactRetrievedOn || today };
}

export function apolloQueue(companies: Company[], priorityDomains: string[], limit: number) {
  if (limit < 1) return [];
  const priority = new Set(priorityDomains.map((domain) => normalizeDomain(domain)).filter(Boolean));
  const need = companies.filter(needsApolloContact);
  const first = need.filter((company) => priority.has(company.domain));
  const rest = need
    .filter((company) => !priority.has(company.domain))
    .sort((a, b) => scoreCompany(b).total - scoreCompany(a).total || a.org.localeCompare(b.org, "en-CA"));
  const seen = new Set<string>();
  const queued: Company[] = [];
  for (const company of [...first, ...rest]) {
    if (!company.domain || seen.has(company.domain)) continue;
    seen.add(company.domain);
    queued.push(company);
    if (queued.length >= limit) break;
  }
  return queued;
}

function dateOnly(value: string) {
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp)) return "";
  return new Date(stamp).toISOString().slice(0, 10);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function pickSearchPerson(body: unknown): { id: string } | null {
  const record = asRecord(body);
  const people = Array.isArray(record?.people) ? record.people : [];
  const ranked = people
    .flatMap((item) => {
      const row = asRecord(item);
      const id = text(row?.id);
      if (!row || !id) return [];
      const title = text(row.title).toLowerCase();
      const titleRank = APOLLO_TARGET_TITLES.findIndex((target) => title.includes(target));
      return [{ id, hasEmail: row.has_email === true, titleRank: titleRank === -1 ? 100 : titleRank }];
    })
    .sort((a, b) => Number(b.hasEmail) - Number(a.hasEmail) || a.titleRank - b.titleRank);
  return ranked[0] ? { id: ranked[0].id } : null;
}

export function readApolloReveal(body: unknown): ApolloReveal | null {
  const record = asRecord(body);
  const person = asRecord(record?.person);
  if (!person) return null;
  const id = text(person.id);
  if (!id) return null;
  const organization = asRecord(person.organization);
  const contact = asRecord(person.contact);
  const history = Array.isArray(person.employment_history) ? person.employment_history : [];
  const current = history.map(asRecord).find((job) => job?.current === true) ?? null;
  const updatedOn = dateOnly(
    text(person.updated_at) ||
      text(person.last_refreshed_at) ||
      text(contact?.updated_at) ||
      text(current?.updated_at),
  );
  const name = text(person.name) || [text(person.first_name), text(person.last_name)].filter(Boolean).join(" ");
  return {
    id,
    name,
    title: text(person.title),
    email: text(person.email),
    emailStatus: text(person.email_status),
    updatedOn,
    organizationName: text(organization?.name) || text(current?.organization_name) || text(contact?.organization_name),
    organizationDomain: text(organization?.primary_domain),
  };
}

export function applyApolloContact(company: Company, person: ApolloReveal | null, today: string): Company {
  if (!person) {
    return { ...company, apolloCheckedOn: today };
  }
  const flags = new Set<string>();
  if ((person.updatedOn && apolloDateIsStale(person.updatedOn, today)) || !apolloEmployerMatches(company, person)) {
    flags.add(APOLLO_STALE);
  }
  const verified = apolloEmailIsVerified(person.emailStatus);
  const email = verified ? person.email.trim().toLowerCase() : "";
  if (!verified || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) flags.add(APOLLO_EMAIL_NOT_VERIFIED);
  const usableEmail = flags.has(APOLLO_EMAIL_NOT_VERIFIED) ? "" : email;
  const next: Company = {
    ...company,
    buyerName: person.name,
    buyerTitle: person.title,
    email: usableEmail,
    emailSource: usableEmail ? APOLLO_SOURCE : "",
    contactSource: "Apollo",
    apolloPersonId: person.id,
    apolloEmailStatus: normalizeEmailStatus(person.emailStatus),
    contactRetrievedOn: today,
    apolloUpdatedOn: person.updatedOn,
    apolloCheckedOn: today,
    cardFlags: [...flags],
  };
  return assignEnrichment(next, today);
}

async function readJson(response: Response, key: string) {
  const raw = await response.text();
  const snippet = redactSecrets(raw, [key]).slice(0, 240);
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  return { body, snippet };
}

export async function enrichHunterContacts(input: {
  companies: Company[];
  domains: string[];
  today: string;
  revealsUsed: number;
  cap: number;
  apiKey: string | null;
  limit: number;
  fetchImpl?: ApolloFetch;
}): Promise<{ companies: Company[]; searches: number; reveals: number; note: string }> {
  const companies = input.companies.map((company) => markPublicContact(company, input.today));
  if (!input.apiKey) {
    return { companies, searches: 0, reveals: 0, note: APOLLO_OFF };
  }
  const queue = apolloQueue(companies, input.domains, input.limit);
  if (queue.length === 0) return { companies, searches: 0, reveals: 0, note: "" };
  if (input.revealsUsed >= input.cap) {
    return { companies, searches: 0, reveals: 0, note: APOLLO_CEILING };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const key = input.apiKey;
  const byDomain = new Map(companies.map((company) => [company.domain, company]));
  let revealsUsed = input.revealsUsed;
  let searches = 0;
  let reveals = 0;
  let note = "";
  let hitCeiling = false;

  for (const company of queue) {
    if (revealsUsed >= input.cap) {
      hitCeiling = true;
      break;
    }
    const searchUrl = apolloRequestUrl("mixed_people/api_search", apolloSearchParams(company));
    let searchResponse: Response;
    try {
      searchResponse = await fetchImpl(searchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "x-api-key": key,
        },
        body: "{}",
        signal: AbortSignal.timeout(20000),
      });
    } catch (error) {
      note = error instanceof Error ? redactSecrets(error.message, [key]) : "Apollo search failed";
      break;
    }
    searches += 1;
    const searched = await readJson(searchResponse, key);
    if (!searchResponse.ok) {
      note = `Apollo HTTP ${searchResponse.status}: ${searched.snippet}`;
      break;
    }
    const chosen = pickSearchPerson(searched.body);
    if (!chosen) {
      const checked = byDomain.get(company.domain);
      if (checked) byDomain.set(company.domain, { ...checked, apolloCheckedOn: input.today });
      continue;
    }
    if (revealsUsed >= input.cap) {
      hitCeiling = true;
      break;
    }
    revealsUsed += 1;
    reveals += 1;
    const revealUrl = apolloRequestUrl("people/match", apolloRevealParams(chosen.id));
    let revealResponse: Response;
    try {
      revealResponse = await fetchImpl(revealUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "x-api-key": key,
        },
        body: "{}",
        signal: AbortSignal.timeout(20000),
      });
    } catch (error) {
      note = error instanceof Error ? redactSecrets(error.message, [key]) : "Apollo reveal failed";
      break;
    }
    const revealed = await readJson(revealResponse, key);
    if (!revealResponse.ok) {
      note = `Apollo HTTP ${revealResponse.status}: ${revealed.snippet}`;
      break;
    }
    const person = readApolloReveal(revealed.body);
    const current = byDomain.get(company.domain) ?? company;
    byDomain.set(company.domain, applyApolloContact(current, person, input.today));
  }

  if (hitCeiling) note = note ? `${note} ${APOLLO_CEILING}` : APOLLO_CEILING;
  return {
    companies: companies.map((company) => byDomain.get(company.domain) ?? company),
    searches,
    reveals,
    note,
  };
}
