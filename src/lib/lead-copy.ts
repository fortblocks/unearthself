import type { Company } from "./lead-score.ts";

function firstName(contact: string) {
  const raw = contact.split("·")[0]?.trim() ?? contact;
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

export function draftForCompany(c: Company): { subject: string; body: string } {
  const name = firstName(c.buyerName);
  const greet = name || "People team";
  const why = c.why.replace(/\s+/g, " ").trim();
  const body = `${greet} —

Unearth Self is a two or three day expedition for teams of 8–24, ninety minutes from Calgary, at Basecamp in Drumheller. Not a hotel ballroom with a hike attached. Land, sequence, recovery. Spring 2027 is the first window we are holding.

I am writing because ${why} Banff is the default offsite from the corridor. We are the other option, and we are taking a handful of first teams.

I will not put a price in this mail. I will not sell an outdoor day until the insurance is signed. If a spring week is live for ${c.org}, send headcount and a month that works. Tess and I will come back with three dates and what a hold looks like. If this is not the year, say so and the file stays quiet.

Christopher
Unearth Self · Drumheller`;
  return {
    subject: `${c.org} — Unearth Self, Drumheller`,
    body,
  };
}
