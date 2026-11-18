import type { Company } from "./lead-score.ts";

function firstName(contact: string) {
  const raw = (contact ?? "").split("·")[0]?.trim() ?? "";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return "";
  return parts[0] ?? "";
}

export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function draftHasPrice(body: string) {
  return /(?:CAD\s*\$?\s*\d|\$\s*\d)/i.test(body);
}

export function draftSellsCanyon(body: string) {
  return /\b(abseil|rappel|rappelling|canyoning)\b/i.test(body);
}

export function draftProblems(body: string): string[] {
  const n = wordCount(body);
  const out: string[] = [];
  if (n < 120) out.push(`House voice is 120–180 words. This is ${n}.`);
  if (n > 180) out.push(`House voice is 120–180 words. This is ${n}.`);
  if (draftHasPrice(body)) out.push("No price until Norah signs (D01).");
  if (draftSellsCanyon(body)) out.push("No canyon product until D13.");
  return out;
}

export const DRAFT_SUBJECT = "Two days on the land with your team";

/**
 * The one letter from docs/operating-system/27_LEADS_SAMPLE_EMAILS.md.
 * Only the greeting and the "You lead ..." line change. Nothing else is added.
 */
export function draftForCompany(c: Company): { subject: string; body: string } {
  const name = firstName(c.buyerName);
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const title = (c.buyerTitle ?? "").trim();
  const role = title ? `${title} at ${c.org}` : `the team side at ${c.org}`;
  const body = `${greeting}

You lead ${role}, so I imagine you've planned more offsites than you'd care to count. I'd love to show you a new one.

Unearth Self is Canada's newest and most exciting corporate retreat concept. A team of six to twenty-four heads out into Alberta's badlands for a multi-day expedition. The days are spent out on rugged ground in the land of the dinosaurs, working out the route together. The evenings end at Basecamp, our refurbished spa in downtown Drumheller, where an infrared sauna, a salt stone steam room and a cold plunge lead to a slow finish on the treatment table.

It's wild country, some of the most beautiful in Canada. Spring 2027 is our first season.

All of it sits about ninety minutes from Calgary. If you'd like your team to be amongst the first to experience Badlands Bootcamp, please get in touch and we can arrange a time for a quick call.

Chris`;
  return { subject: DRAFT_SUBJECT, body };
}

type DraftThread = {
  companyId?: string;
  leadId?: string;
  dir: string;
  subject: string;
  body: string;
};

function hasOutbound(company: Company, threads: DraftThread[]) {
  return threads.some(
    (thread) =>
      thread.dir === "out" &&
      (thread.companyId === company.id || (company.filedLeadId !== "" && thread.leadId === company.filedLeadId)),
  );
}

/**
 * Replace unsent drafts with the current letter.
 * Stopped companies, sent threads, and every other field stay as they are.
 */
export function refreshUnsentDrafts<T extends DraftThread>(companies: Company[], threads: T[]) {
  const skip = new Set(
    companies.filter((company) => company.status === "stopped" || hasOutbound(company, threads)).map((company) => company.id),
  );
  const nextCompanies = companies.map((company) => {
    if (skip.has(company.id)) return company;
    const draft = draftForCompany(company);
    if (company.draftSubject === draft.subject && company.draftBody === draft.body) return company;
    return { ...company, draftSubject: draft.subject, draftBody: draft.body };
  });
  const byId = new Map(nextCompanies.map((company) => [company.id, company]));
  const nextThreads = threads.map((thread) => {
    if (thread.dir !== "draft") return thread;
    const company =
      (thread.companyId ? byId.get(thread.companyId) : undefined) ??
      nextCompanies.find((item) => item.filedLeadId !== "" && item.filedLeadId === thread.leadId);
    if (!company || skip.has(company.id)) return thread;
    if (thread.subject === company.draftSubject && thread.body === company.draftBody) return thread;
    return { ...thread, subject: company.draftSubject, body: company.draftBody };
  });
  return { companies: nextCompanies, threads: nextThreads };
}
