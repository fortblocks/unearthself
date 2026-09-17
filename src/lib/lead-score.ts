/** Score 100 = Fit 60 + Access 25 + Timing 15. Computed, never guessed. */

export type LeadCity = "Calgary" | "Edmonton" | "Red Deer" | "Alberta";
export type SizeBand = "1-49" | "50-79" | "80-800" | "801-1500" | "1500+";
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

export type Company = {
  id: string;
  org: string;
  domain: string;
  city: LeadCity;
  industry: Industry;
  sizeBand: SizeBand;
  sourceUrl: string;
  why: string;
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
};

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

export function scoreCompany(c: {
  city: LeadCity;
  industry: Industry;
  sizeBand: SizeBand;
  sourceUrl: string;
  buyerName: string;
  email: string;
  emailSource: string;
  timingScore: number;
}): ScoreBreak {
  const geo = geoPoints(c.city);
  const size = sizePoints(c.sizeBand);
  const industry = industryPoints(c.industry);
  const fit = geo + size + industry;
  const named = namedPerson(c.buyerName) ? 12 : 0;
  const mail = publishedEmail(c.email, c.emailSource) ? 10 : 0;
  const source = /^https?:\/\//i.test(c.sourceUrl.trim()) ? 3 : 0;
  const access = named + mail + source;
  const timing = Math.max(0, Math.min(15, Math.round(c.timingScore)));
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
  if (!text) return { rows: [], error: "Paste JSON from the Lead Scout." };
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

function nextCompanyId(rows: { id: string }[]) {
  const nums = rows
    .map((r) => Number(String(r.id).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `C-${String(n).padStart(3, "0")}`;
}

/** Deduplicate on domain. Unsourced emails are dropped — never invented. */
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
        lastTouch: opts.today,
        scoutBatch: opts.batch,
      };
      merged += 1;
      continue;
    }
    next.unshift({
      id: nextCompanyId(next),
      org: row.org || domain,
      domain,
      city: coerceCity(row.city),
      industry: coerceIndustry(row.industry),
      sizeBand: coerceSize(row.sizeBand),
      sourceUrl: row.sourceUrl || "",
      why: row.why || "Scout ingest. Research card.",
      buyerName: row.buyer?.name ?? "",
      buyerTitle: row.buyer?.title ?? "",
      email: mail.email,
      emailSource: mail.emailSource,
      timingNote: "Ingested from Lead Scout. Timing default: planning season.",
      timingScore: 11,
      status: "watch",
      filedLeadId: "",
      draftSubject: "",
      draftBody: "",
      lastTouch: opts.today,
      scoutBatch: opts.batch,
    });
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
