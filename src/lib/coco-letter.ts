import { draftHasPrice } from "./lead-copy.ts";
import type { Company } from "./lead-score.ts";

/** Chris's approved openers. A letter uses one of these, never "Tess and I". */
export const COCO_INTRO_TEAM =
  "I'm Christopher, part of the Unearth Self team building a place for teams in the Canadian Badlands";

export const COCO_INTRO_FOUNDER =
  "I'm Christopher, a founder of Unearth Self, a place for teams in the Canadian Badlands";

export const COCO_INTROS = [COCO_INTRO_TEAM, COCO_INTRO_FOUNDER] as const;

export const COCO_LETTER_SUBJECT = "A week in Drumheller for your team";

/** The desk shows this when a card has no verified hook and no signal note. */
export const NEEDS_RESEARCH_REASON = "Needs research";

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

/** One line the letter can quote. Em dashes become commas so the house rule still passes. */
export function cleanLetterReason(text: string) {
  return text.replace(/\u2014/g, ",").replace(/\s+/g, " ").trim().replace(/[.!?]+$/g, "");
}

/**
 * The only company-specific lines a letter may use.
 * A verified hook has text, a source URL, and a source date. Otherwise the latest signal note.
 * The card's why field is never a reason.
 */
export function letterSpecifics(company: Pick<Company, "hook" | "signals">): { hookText: string; signalNote: string } {
  const hook = company.hook;
  const rawHook = hook?.text?.trim() && hook.sourceUrl?.trim() && hook.sourceDate?.trim() ? hook.text : "";
  const rawSignal = [...(company.signals ?? [])].reverse().find((item) => item.note?.trim())?.note ?? "";
  return { hookText: cleanLetterReason(rawHook), signalNote: cleanLetterReason(rawSignal) };
}

/**
 * Internal labels and unfilled slots. Whole words, so "nullable" and "coconut" are not hits.
 * A company name is removed first, including the name after "I read this about".
 * URLs are removed first so a signed unsubscribe token cannot look like the word "null".
 */
const INTERNAL_LEAK: RegExp[] = [
  /\bresearch card\b/i,
  /\bhunter\b/i,
  /\bcoco\b/i,
  /\bpublic pages show\b/i,
  /\bnightly ingest\b/i,
  /\$\{/,
  /\{\{/,
  /\[\s*\]/,
  /\bTODO\b/i,
  /\bundefined\b/i,
  /\bnull\b/i,
  /\bplaceholder\b/i,
];

function withoutUrls(text: string) {
  return text.replace(/https?:\/\/[^\s<>"']+/gi, " ");
}

function shieldNames(text: string, names: readonly string[]) {
  let next = text;
  const unique = [...names].filter((name) => name.trim().length >= 3).sort((a, b) => b.length - a.length);
  for (const name of unique) {
    const trimmed = name.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(escaped, "gi"), " ");
  }
  return next;
}

function namesToShield(text: string, org?: string) {
  const names: string[] = [];
  const add = (name: string) => {
    const trimmed = name.trim().replace(/[.,;:]+$/g, "").trim();
    if (trimmed.length < 3) return;
    if (names.some((have) => have.toLowerCase() === trimmed.toLowerCase())) return;
    names.push(trimmed);
  };
  if (org) add(org);
  for (const match of text.matchAll(/\bI (?:read this about|was looking at)\s+([^:\n]+)/gi)) {
    add(match[1] ?? "");
  }
  return names;
}

export function draftLeaksInternal(text: string, org?: string) {
  const prose = withoutUrls(text);
  const shielded = shieldNames(prose, namesToShield(prose, org));
  return INTERNAL_LEAK.some((pattern) => pattern.test(shielded));
}

/**
 * The desk letter Coco can file before anyone presses approve.
 * One approved intro, one sourced line, and PACE. No season claim and no internal label.
 * Returns null when there is no verified hook and no signal note. Nothing is drafted then.
 * The unsubscribe link is added later, by the draft store.
 */
export function cocoLetter(company: Company): { subject: string; body: string } | null {
  const { hookText, signalNote } = letterSpecifics(company);
  const reason = hookText || signalNote;
  if (!reason) return null;
  if (draftLeaksInternal(reason, company.org) || draftMentionsTessAndI(reason) || draftHasPrice(reason)) return null;
  const name = usableFirstName(company.buyerName);
  const greeting = name ? `Hi ${name},` : "Hello,";
  const body = `${greeting}

${introFor(company)}.

I read this about ${company.org}: ${reason}. That is the reason for this letter.

The days follow PACE: Play, Adaptability, Connection, Experience. Play is the start, out on the land, before the group has to perform. Adaptability is the middle, when the route changes and the team has to choose together. Connection is the work between people. Experience is the last stretch, when the week has a shape they can take home. The evenings end at Basecamp in Drumheller.

A short reply is enough. If a week is useful for the people you are responsible for, tell me and I will come back with three dates. If it is not, say so and I will leave the file quiet.

Christopher`;
  if (draftLeaksInternal(`${COCO_LETTER_SUBJECT}\n${body}`, company.org)) return null;
  if (draftMentionsTessAndI(body) || greetingNameCheck(body) || draftHasPrice(body)) return null;
  return { subject: COCO_LETTER_SUBJECT, body };
}
