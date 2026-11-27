import { draftHasPrice } from "./lead-copy.ts";
import type { Company } from "./lead-score.ts";

/** Chris's approved opener. A letter uses this, never "Tess and I". */
export const COCO_INTRO =
  "I'm Christopher, one of the founders of Unearth Self, and we run team retreats in the Canadian Badlands near Drumheller, Alberta.";

export const COCO_INTROS = [COCO_INTRO] as const;

/** Subject for one company. The public name is the only slot. */
export function cocoLetterSubject(org: string) {
  return `A different room for the ${org} team`;
}

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

/** The sourced line as its own paragraph. A missing closing stop is added back. */
export function letterParagraph(text: string) {
  const cleaned = cleanLetterReason(text);
  if (!cleaned) return "";
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

/**
 * Chris's GAM Tech letter. The greeting, the company, and paragraph 2 are the only slots.
 * Paragraph 2 is the verified hook or the latest signal note. A later edit may add a bridge after that line.
 */
export function renderCocoLetter(input: { org: string; greeting: string; hookParagraph: string }) {
  const subject = cocoLetterSubject(input.org);
  const body = `${input.greeting}

${COCO_INTRO}

${input.hookParagraph}

Your team would be out in the coulees, among the hoodoos, instead of sitting in a meeting room. It's a much easier place to have a proper conversation.

The days follow PACE, a retreat concept we built around Play, Adaptability, Connection and Experience. They're skills that matter at work and in life, and ones we all forget now and then. It makes for good team building, and for knowing yourself a little better. The evenings end at Basecamp, our retreat centre in downtown Drumheller.

We're taking bookings for 2027 now. If you're curious, reply and I'll tell you more.

Christopher
Founding Partner`;
  return { subject, body };
}

/**
 * The desk letter Coco can file before anyone presses approve.
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
  const letter = renderCocoLetter({ org: company.org, greeting, hookParagraph: letterParagraph(reason) });
  if (draftLeaksInternal(`${letter.subject}\n${letter.body}`, company.org)) return null;
  if (draftMentionsTessAndI(letter.body) || greetingNameCheck(letter.body) || draftHasPrice(letter.body)) return null;
  return letter;
}
