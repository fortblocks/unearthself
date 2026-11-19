/** Score 100 = Fit 60 + Access 25 + Timing 15. Computed, never guessed. */

export type LeadCity = "Calgary" | "Edmonton" | "Red Deer" | "Alberta" | "Elsewhere";
export type SizeBand = "1-49" | "50-79" | "80-800" | "801-1500" | "1500+" | "unknown";
export type Industry =
  | "energy"
  | "construction"
  | "professional"
  | "healthcare"
  | "engineering"
  | "logistics"
  | "education"
  | "civic"
  | "tech"
  | "other";
export type ScoreBand = "pursue" | "sequence" | "watch" | "hold";
export type CompanyStatus = "watch" | "sequence" | "stopped" | "filed";

export type Buyer = {
  name: string;
  title: string;
  email: string;
  emailSource: string;
};

/** Dated public signals. Timing is derived from these, never typed in. */
export type SignalKind = "hiring" | "office" | "expansion" | "win" | "year-end";

export type DatedSignal = {
  id: string;
  kind: SignalKind;
  date: string;
  sourceUrl: string;
  note: string;
};

export type WhySource = {
  url: string;
  label: string;
};

/** Section 9 of the Hunter spec. Only Enriched and No-signal can count as contact-ready. */
export type EnrichmentState = "not-enriched" | "enriched" | "no-signal";

/** Where the name, title, and email on a card came from. */
export type ContactSource = "Apollo" | "Public page";

export type Company = {
  id: string;
  org: string;
  domain: string;
  city: LeadCity;
  industry: Industry;
  sizeBand: SizeBand;
  sourceUrl: string;
  why: string;
  whySources?: WhySource[];
  signals?: DatedSignal[];
  buyerName: string;
  buyerTitle: string;
  email: string;
  emailSource: string;
  timingNote: string;
  timingScore: number;
  status: CompanyStatus;
  filedLeadId: string;
  draftSubject: string;
  draftBody: string;
  lastTouch: string;
  scoutBatch: string;
  /** Who filed the card. Missing on older nightly and hand cards. The stored value "scout" is Hunter's nightly run. */
  source?: "scout" | "hunter" | "hand";
  /** City and country as printed on the source page. */
  place?: string;
  /** Search region used when the Hunter filed or updated the card. */
  hunterRegion?: string;
  profileHits?: { id: string; label: string; sourceUrl: string }[];
  /** Set when a Hunter run evaluates the card. Absent on older cards. */
  enrichment?: EnrichmentState;
  /** Edmonton date the card was marked Enriched or No-signal. */
  enrichmentOn?: string;
  /** Apollo or a public page. Absent until a contact is sourced. */
  contactSource?: ContactSource;
  /** Apollo person id. The logged source for a licensed contact. */
  apolloPersonId?: string;
  /** Apollo email_status, stored even when the email is not used. */
  apolloEmailStatus?: string;
  /** Edmonton date the contact was retrieved. */
  contactRetrievedOn?: string;
  /** Apollo's last-updated date, when the response includes one. */
  apolloUpdatedOn?: string;
  /** Set after a search, including a search that found nobody, so the same company is not revealed again. */
  apolloCheckedOn?: string;
  /** Visible flags such as Stale or Apollo email not verified. */
  cardFlags?: string[];
  /** Hunter profile score, kept with the card. The leads table still shows the 100-point score. */
  hunterScore?: number;
  hunterBreak?: { profile: number; access: number; timing: number; travel: number; total: number };
  lineage?: {
    method: string;
    query: string;
    promptVersion: string;
    model: string;
    scoreVersion: string;
    signals: string[];
    sourceUrl: string;
    experimentId: string;
    axis: "" | "subject" | "opener" | "angle";
    variants?: { id: string; text: string; status: "live" | "winner" | "retired" }[];
    assignments?: { cardId: string; variantId: string; approvedAt: string; sentAt: string; fromAddress: string }[];
    sampleFloor: number;
    exploration?: boolean;
  };
  caslStatus?: "recorded" | "awaiting-chris";
  review?: "unreviewed" | "approved" | "skipped" | "expired-unreviewed";
  skipReason?: "wrong-size" | "wrong-sector" | "no-retreat-signal" | "bad-contact" | "duplicate" | "other";
  pipeline?: "" | "sent" | "replied" | "booked" | "won" | "lost";
  pipelineOn?: string;
  reviewedOn?: string;
  filedOn?: string;
  dedupeKey?: string;
  casl?: {
    publishedOn: string;
    roleFit: boolean;
    noUnsolicitedNotice: boolean;
    provider?: "Apollo";
    pulledOn?: string;
    statement?: string;
  };
  emailMx?: boolean;
  contactLastSeenOn?: string;
  facts?: { sourceUrl: string; fetchedOn: string; snippet: string }[];
};

export type ScoutIngest = {
  domain: string;
  org?: string;
  city?: string;
  industry?: string;
  sizeBand?: string;
  sourceUrl?: string;
  why?: string;
  buyer?: {
    name?: string;
    title?: string;
    email?: string;
    emailSource?: string;
  };
  signals?: unknown;
  whySources?: unknown;
};

/** Drop a Partner flag so the leads table cannot grow that column back. The Hunter score and lineage stay. */
export function asLeadCompany(company: Company): Company {
  const next = { ...company } as Company & { partnerFlag?: unknown };
  delete next.partnerFlag;
  return next;
}

export type ScoreBreak = {
  fit: number;
  geo: number;
  size: number;
  industry: number;
  access: number;
  named: number;
  publishedEmail: number;
  source: number;
  timing: number;
  total: number;
  band: ScoreBand;
};

export const FIRST_WAVE: Industry[] = [
  "energy",
  "construction",
  "professional",
  "healthcare",
  "engineering",
  "logistics",
  "education",
  "civic",
];

export const ADJACENT: Industry[] = ["tech"];

export function normalizeDomain(raw: string) {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes("@") && !trimmed.includes("/")) {
    return trimmed.split("@").pop()?.replace(/^www\./, "") ?? "";
  }
  return trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .replace(/\.$/, "");
}

function namedPerson(name: string) {
  const n = name.trim();
  if (!n) return false;
  const lower = n.toLowerCase();
  if (lower.includes("unnamed") || lower === "people" || lower === "hr" || lower === "team") return false;
  return n.split(/\s+/).filter(Boolean).length >= 2;
}

function publishedEmail(email: string, emailSource: string) {
  if (!email.trim() || !emailSource.trim()) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) return false;
  if (emailSource.trim().toLowerCase() === "apollo") return true;
  return /^https?:\/\//i.test(emailSource.trim());
}

export function geoPoints(city: LeadCity): number {
  if (city === "Calgary") return 22;
  if (city === "Edmonton") return 20;
  if (city === "Red Deer") return 16;
  return 6;
}

export function sizePoints(band: SizeBand): number {
  if (band === "80-800") return 22;
  if (band === "50-79" || band === "801-1500") return 10;
  return 0;
}

export function industryPoints(industry: Industry): number {
  if (FIRST_WAVE.includes(industry)) return 16;
  if (ADJACENT.includes(industry)) return 8;
  return 0;
}

const SIGNAL_WEIGHT: Record<SignalKind, number> = {
  hiring: 8,
  office: 6,
  expansion: 6,
  win: 5,
  "year-end": 4,
};

/** 1 within 14 days, then 0.7, 0.4, 0.2, then nothing after 180 days. */
export function recencyFactor(days: number): number {
  if (!Number.isFinite(days) || days < 0) return 0;
  if (days <= 14) return 1;
  if (days <= 45) return 0.7;
  if (days <= 90) return 0.4;
  if (days <= 180) return 0.2;
  return 0;
}

export function edmontonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function utcDayNumber(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return Math.round(utc / 86_400_000);
}

export function daysBetween(today: string, earlier: string): number | null {
  const a = utcDayNumber(today);
  const b = utcDayNumber(earlier);
  if (a == null || b == null) return null;
  return a - b;
}

export function coerceSignalKind(raw: string | undefined): SignalKind | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (/hir|job|recruit|career/.test(v)) return "hiring";
  if (/office|move|relocat|new (hq|head)/.test(v)) return "office";
  if (/expand|growth|new market|opened/.test(v)) return "expansion";
  if (/win|award|contract|project/.test(v)) return "win";
  if (/year-end|year end|fiscal|results|earnings/.test(v)) return "year-end";
  if (v === "hiring" || v === "office" || v === "expansion" || v === "win" || v === "year-end") return v;
  return null;
}

export function normalizeSignals(raw: unknown, idPrefix = "S"): DatedSignal[] {
  if (!Array.isArray(raw)) return [];
  const out: DatedSignal[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind = coerceSignalKind(String(row.kind ?? row.type ?? ""));
    const date = String(row.date ?? "").trim();
    const sourceUrl = String(row.sourceUrl ?? row.url ?? row.source ?? "").trim();
    if (!kind || utcDayNumber(date) == null || !/^https?:\/\//i.test(sourceUrl)) continue;
    out.push({
      id: String(row.id ?? `${idPrefix}-${out.length + 1}`),
      kind,
      date: date.slice(0, 10),
      sourceUrl,
      note: String(row.note ?? row.label ?? "").trim(),
    });
  }
  return out;
}

export function normalizeWhySources(raw: unknown): WhySource[] {
  if (!Array.isArray(raw)) return [];
  const out: WhySource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const url = String(row.url ?? row.sourceUrl ?? "").trim();
    if (!/^https?:\/\//i.test(url)) continue;
    out.push({ url, label: String(row.label ?? row.title ?? "Source").trim() || "Source" });
  }
  return out;
}

/**
 * Timing /15.
 * Each dated signal with a source URL contributes its weight times a recency factor.
 * A last touch in the last 13 days subtracts 4. A touch 14 to 60 days ago adds 3.
 * A touch 61 to 120 days ago adds 1. The result is rounded and clamped to 0-15.
 */
export function signalContribution(
  signal: Pick<DatedSignal, "kind" | "date" | "sourceUrl">,
  today: string,
): number {
  if (!/^https?:\/\//i.test(signal.sourceUrl.trim())) return 0;
  const age = daysBetween(today, signal.date);
  if (age == null) return 0;
  return SIGNAL_WEIGHT[signal.kind] * recencyFactor(age);
}

export function timingFromSignals(input: {
  signals: Array<Pick<DatedSignal, "kind" | "date" | "sourceUrl">>;
  lastTouch?: string;
  today: string;
}): { timing: number; signalPoints: number; touchPoints: number } {
  let signalPoints = 0;
  for (const signal of input.signals) {
    if (!/^https?:\/\//i.test(signal.sourceUrl.trim())) continue;
    const age = daysBetween(input.today, signal.date);
    if (age == null) continue;
    signalPoints += SIGNAL_WEIGHT[signal.kind] * recencyFactor(age);
  }
  let touchPoints = 0;
  if (input.lastTouch?.trim()) {
    const since = daysBetween(input.today, input.lastTouch);
    if (since != null && since >= 0) {
      if (since <= 13) touchPoints = -4;
      else if (since <= 60) touchPoints = 3;
      else if (since <= 120) touchPoints = 1;
    }
  }
  const timing = Math.max(0, Math.min(15, Math.round(signalPoints + touchPoints)));
  return { timing, signalPoints, touchPoints };
}

export function scoreCompany(c: {
  city: LeadCity;
  industry: Industry;
  sizeBand: SizeBand;
  sourceUrl: string;
  buyerName: string;
  email: string;
  emailSource: string;
  timingScore?: number;
  signals?: DatedSignal[];
  lastTouch?: string;
  today?: string;
}): ScoreBreak {
  const geo = geoPoints(c.city);
  const size = sizePoints(c.sizeBand);
  const industry = industryPoints(c.industry);
  const fit = geo + size + industry;
  const named = namedPerson(c.buyerName) ? 12 : 0;
  const mail = publishedEmail(c.email, c.emailSource) ? 10 : 0;
  const source = /^https?:\/\//i.test(c.sourceUrl.trim()) ? 3 : 0;
  const access = named + mail + source;
  const timing = Array.isArray(c.signals)
    ? timingFromSignals({
        signals: c.signals,
        lastTouch: c.lastTouch,
        today: c.today ?? edmontonToday(),
      }).timing
    : Math.max(0, Math.min(15, Math.round(c.timingScore ?? 0)));
  const total = fit + access + timing;
  return { fit, geo, size, industry, access, named, publishedEmail: mail, source, timing, total, band: bandFor(total) };
}

export function bandFor(total: number): ScoreBand {
  if (total >= 90) return "pursue";
  if (total >= 70) return "sequence";
  if (total >= 50) return "watch";
  return "hold";
}

export function bandLabel(band: ScoreBand) {
  if (band === "pursue") return "Pursue";
  if (band === "sequence") return "Sequence if sendable";
  if (band === "watch") return "Watch";
  return "Do not email";
}

/** Named person + published email + source URL. Draft is allowed without this; send is not. */
export function hasAccess(c: {
  buyerName: string;
  email: string;
  emailSource: string;
  sourceUrl: string;
}) {
  return (
    namedPerson(c.buyerName) &&
    publishedEmail(c.email, c.emailSource) &&
    /^https?:\/\//i.test(c.sourceUrl.trim())
  );
}

export function isSendable(c: Company, score: ScoreBreak) {
  if (c.status === "stopped") return false;
  if (score.band === "hold") return false;
  if (score.band === "watch") return false;
  return hasAccess(c);
}

export function parseScoutBatch(raw: string): { rows: ScoutIngest[]; error: string | null } {
  const text = raw.trim();
  if (!text) return { rows: [], error: "Paste JSON from Hunter's nightly run." };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { rows: [], error: "That is not JSON." };
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { companies?: unknown }).companies)
      ? (data as { companies: unknown[] }).companies
      : data && typeof data === "object" && Array.isArray((data as { leads?: unknown }).leads)
        ? (data as { leads: unknown[] }).leads
        : data && typeof data === "object"
          ? [data]
          : [];
  const rows: ScoutIngest[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const domain = normalizeDomain(String(row.domain ?? row.website ?? row.url ?? ""));
    if (!domain) continue;
    const buyerRaw = (row.buyer ?? row.contact ?? {}) as Record<string, unknown>;
    rows.push({
      domain,
      org: String(row.org ?? row.name ?? row.company ?? "").trim(),
      city: String(row.city ?? "").trim(),
      industry: String(row.industry ?? row.sector ?? "").trim(),
      sizeBand: String(row.sizeBand ?? row.size ?? row.headcount ?? "").trim(),
      sourceUrl: String(row.sourceUrl ?? row.source ?? row.url ?? "").trim(),
      why: String(row.why ?? row.note ?? "").trim(),
      buyer: {
        name: String(buyerRaw.name ?? buyerRaw.buyer ?? "").trim(),
        title: String(buyerRaw.title ?? buyerRaw.role ?? "").trim(),
        email: String(buyerRaw.email ?? row.email ?? "").trim(),
        emailSource: String(buyerRaw.emailSource ?? buyerRaw.source ?? row.emailSource ?? "").trim(),
      },
      signals: Array.isArray(row.signals) ? row.signals : undefined,
      whySources: Array.isArray(row.whySources) ? row.whySources : undefined,
    });
  }
  if (!rows.length) return { rows: [], error: "No rows with a domain." };
  return { rows, error: null };
}

export function sourcedEmail(email: string, emailSource: string) {
  const e = email.trim().toLowerCase();
  const s = emailSource.trim();
  if (!e || !s) return { email: "", emailSource: "" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { email: "", emailSource: "" };
  if (!/^https?:\/\//i.test(s)) return { email: "", emailSource: "" };
  return { email: e, emailSource: s };
}

function mergeSignals(current: DatedSignal[] | undefined, incoming: DatedSignal[]): DatedSignal[] {
  const merged = [...(current ?? [])];
  for (const signal of incoming) {
    const dup = merged.some(
      (have) => have.kind === signal.kind && have.date === signal.date && have.sourceUrl === signal.sourceUrl,
    );
    if (!dup) merged.push(signal);
  }
  return merged;
}

function nextCompanyId(rows: { id: string }[]) {
  const nums = rows
    .map((r) => Number(String(r.id).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `C-${String(n).padStart(3, "0")}`;
}

/** Deduplicate on domain. Unsourced emails are dropped. Never invented. */
export function mergeScoutRows(
  companies: Company[],
  rows: ScoutIngest[],
  opts: { batch: string; today: string },
): { companies: Company[]; added: number; merged: number; skipped: number } {
  const next = [...companies];
  let added = 0;
  let merged = 0;
  let skipped = 0;
  for (const row of rows) {
    const domain = normalizeDomain(row.domain);
    if (!domain) {
      skipped += 1;
      continue;
    }
    const mail = sourcedEmail(row.buyer?.email ?? "", row.buyer?.emailSource ?? "");
    const incomingSignals = normalizeSignals(row.signals);
    const incomingWhy = normalizeWhySources(row.whySources);
    const existing = next.find((c) => c.domain === domain);
    if (existing) {
      const idx = next.findIndex((c) => c.id === existing.id);
      next[idx] = {
        ...existing,
        org: row.org || existing.org,
        city: row.city ? coerceCity(row.city, existing.city) : existing.city,
        industry: row.industry ? coerceIndustry(row.industry, existing.industry) : existing.industry,
        sizeBand: row.sizeBand ? coerceSize(row.sizeBand, existing.sizeBand) : existing.sizeBand,
        sourceUrl: row.sourceUrl || existing.sourceUrl,
        why: row.why || existing.why,
        buyerName: row.buyer?.name || existing.buyerName,
        buyerTitle: row.buyer?.title || existing.buyerTitle,
        email: mail.email || existing.email,
        emailSource: mail.email ? mail.emailSource : existing.emailSource,
        signals: incomingSignals.length ? mergeSignals(existing.signals, incomingSignals) : existing.signals,
        whySources: incomingWhy.length ? incomingWhy : existing.whySources,
        lastTouch: opts.today,
        scoutBatch: opts.batch,
      };
      if (Array.isArray(next[idx].signals)) {
        next[idx].timingScore = timingFromSignals({
          signals: next[idx].signals ?? [],
          lastTouch: next[idx].lastTouch,
          today: opts.today,
        }).timing;
      }
      merged += 1;
      continue;
    }
    const signals = incomingSignals;
    const created: Company = {
      id: nextCompanyId(next),
      org: row.org || domain,
      domain,
      city: coerceCity(row.city),
      industry: coerceIndustry(row.industry),
      sizeBand: coerceSize(row.sizeBand),
      sourceUrl: row.sourceUrl || "",
      why: row.why || "Nightly ingest. Research card.",
      whySources: incomingWhy,
      signals,
      buyerName: row.buyer?.name ?? "",
      buyerTitle: row.buyer?.title ?? "",
      email: mail.email,
      emailSource: mail.emailSource,
      timingNote: signals.length ? "Timing from dated signals." : "No dated signals yet.",
      timingScore: timingFromSignals({ signals, lastTouch: opts.today, today: opts.today }).timing,
      status: "watch",
      filedLeadId: "",
      draftSubject: "",
      draftBody: "",
      lastTouch: opts.today,
      scoutBatch: opts.batch,
    };
    next.unshift(created);
    added += 1;
  }
  return { companies: next, added, merged, skipped };
}

export function coerceCity(raw: string | undefined, fallback: LeadCity = "Alberta"): LeadCity {
  const v = (raw ?? "").trim().toLowerCase();
  if (v.includes("calgary") || v.includes("okotoks") || v.includes("airdrie")) return "Calgary";
  if (v.includes("edmonton") || v.includes("strathcona") || v.includes("st. albert") || v.includes("st albert"))
    return "Edmonton";
  if (v.includes("red deer")) return "Red Deer";
  if (v.includes("alberta") || v === "ab") return "Alberta";
  return fallback;
}

export function coerceIndustry(raw: string | undefined, fallback: Industry = "other"): Industry {
  const v = (raw ?? "").trim().toLowerCase();
  if (/energy|oil|gas|e&p|producer/.test(v)) return "energy";
  if (/construct|build|trades|contractor/.test(v)) return "construction";
  if (/law|legal|account|advisory|professional/.test(v)) return "professional";
  if (/health|care|nursing|hospital/.test(v)) return "healthcare";
  if (/engineer|consulting eng/.test(v)) return "engineering";
  if (/logistics|transport|freight|trucking/.test(v)) return "logistics";
  if (/college|polytech|universit|education|sait|nait/.test(v)) return "education";
  if (/civic|municipal|city of|county|public sector/.test(v)) return "civic";
  if (/tech|software|saas/.test(v)) return "tech";
  return fallback;
}

export function coerceSize(raw: string | undefined, fallback: SizeBand = "80-800"): SizeBand {
  const v = (raw ?? "").trim().toLowerCase().replace(/\s/g, "");
  if (["1-49", "1–49", "<50", "small"].includes(v)) return "1-49";
  if (["50-79", "50–79"].includes(v)) return "50-79";
  if (["80-800", "80–800", "mid", "80-500", "100-500", "100-800"].includes(v)) return "80-800";
  if (["801-1500", "801–1500", "800-1500", "800–1500"].includes(v)) return "801-1500";
  if (["1500+", ">1500", "large"].includes(v)) return "1500+";
  const n = Number(v.replace(/[^\d]/g, ""));
  if (n > 0) {
    if (n < 50) return "1-49";
    if (n < 80) return "50-79";
    if (n <= 800) return "80-800";
    if (n <= 1500) return "801-1500";
    return "1500+";
  }
  return fallback;
}
