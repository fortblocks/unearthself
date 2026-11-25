import { draftHasPrice } from "./lead-copy.ts";
import type { Company } from "./lead-score.ts";

/** Chris's approved openers. A letter uses one of these, never "Tess and I". */
export const COCO_INTRO_TEAM =
  "I'm Christopher, part of the Unearth Self team building a place for teams in the Canadian Badlands";

export const COCO_INTRO_FOUNDER =
  "I'm Christopher, a founder of Unearth Self, a place for teams in the Canadian Badlands";

export const COCO_INTROS = [COCO_INTRO_TEAM, COCO_INTRO_FOUNDER] as const;

export const COCO_LETTER_SUBJECT = "A week in Drumheller for your team";

/** Rejects the phrase in any casing, including a line break between the words. */
export function draftMentionsTessAndI(text: string) {
  return /tess\s+and\s+i\b/i.test(text);
}

/** Initials, one or two letters, or a name written in all capitals. An email is never a name. */
export function unusableGivenName(name: string) {
  const trimmed = name.trim().replace(/\.$/, "");
  if (!trimmed || trimmed.includes("@")) return true;
  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return true;
  return letters === letters.toUpperCase();
}

/**
 * The sourced given name, from a two-part contact such as "Ada North".
 * "NN Srinivas", "Jo", "ADA North", and anything with an @ sign are not names.
 */
export function usableFirstName(contact: string) {
  const raw = (contact ?? "").split("·")[0]?.trim() ?? "";
  if (!raw || raw.includes("@")) return "";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return "";
  const first = parts[0] ?? "";
  if (unusableGivenName(first)) return "";
  return first;
}

/** A greeting that uses an unusable name, such as "Hello NN," or "Hi ADA,". "Hello," is allowed. */
export function greetingNameCheck(body: string) {
  const match = body.match(/^\s*(?:hi|hello)\s+([A-Za-z][A-Za-z.'-]*)\s*,/i);
  if (!match) return false;
  return unusableGivenName(match[1] ?? "");
}

function introFor(company: Company) {
  const sum = [...company.id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return sum % 2 === 0 ? COCO_INTRO_TEAM : COCO_INTRO_FOUNDER;
}

function researchClause(company: Company) {
  const signal = [...(company.signals ?? [])].reverse().find((item) => item.note?.trim());
  const raw = (signal?.note ?? company.why ?? "").replace(/\u2014/g, ",").replace(/\s+/g, " ").trim();
  const sentence = raw.split(/(?<=[.!?])\s/)[0]?.trim().replace(/[.]+$/, "") ?? "";
  if (!sentence || sentence.length > 90 || draftMentionsTessAndI(sentence) || draftHasPrice(sentence)) {
    return `I was looking at ${company.org} before I wrote.`;
  }
  return `I read this about ${company.org}: ${sentence}.`;
}

/**
 * The desk letter Coco can file before anyone presses approve.
 * One approved intro, one company-specific line, PACE, 2027 bookings, and a short reply.
 * The unsubscribe link is added later, by the draft store.
 */
export function cocoLetter(company: Company): { subject: string; body: string } {
  const name = usableFirstName(company.buyerName);
  const greeting = name ? `Hi ${name},` : "Hello,";
  const body = `${greeting}

${introFor(company)}.

${researchClause(company)} That is the reason for this letter.

The days follow PACE: Play, Adaptability, Connection, Experience. Play is the start, out on the land, before the group has to perform. Adaptability is the middle, when the route changes and the team has to choose together. Connection is the work between people. Experience is the last stretch, when the week has a shape they can take home. The evenings end at Basecamp in Drumheller.

We are taking bookings for 2027. I am holding the first window of that year.

A short reply is enough. If a week in that window is useful for the people you are responsible for, tell me and I will come back with three dates. If it is not, say so and I will leave the file quiet.

Christopher`;
  return { subject: COCO_LETTER_SUBJECT, body };
}
