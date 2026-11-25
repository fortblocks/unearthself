/**
 * Gate from docs/operating-system/26_LEADS_PRODUCT_EVOLUTION.md section 4.
 * A letter can be edited and checked again. It cannot be approved while this fails.
 * No model call. The check is the reject list and the house voice rules.
 */

import { draftHasPrice, draftSellsCanyon, letterForWordCount, wordCount } from "./lead-copy.ts";

export type HumanizerResult = {
  pass: boolean;
  notes: string[];
};

const BANNED: Array<[string, RegExp]> = [
  ["an em dash", /\u2014/],
  ["synergy", /\bsynergy\b/i],
  ["leverage", /\bleverage\b/i],
  ["circle back", /\bcircle back\b/i],
  ["touch base", /\btouch base\b/i],
  ["bandwidth", /\bbandwidth\b/i],
  ["unpack", /\bunpack\b/i],
  ["deep dive", /\bdeep dive\b/i],
  ["move the needle", /\bmove the needle\b/i],
  ["value-add", /\bvalue-add\b/i],
  ["best-in-class", /\bbest-in-class\b/i],
  ["world-class", /\bworld-class\b/i],
  ["cutting-edge", /\bcutting-edge\b/i],
  ["seamless", /\bseamless\b/i],
  ["curated", /\bcurated\b/i],
  ["journey", /\bjourney\b/i],
  ["unlock", /\bunlock\b/i],
  ["elevate", /\belevate\b/i],
  ["transformative", /\btransformative\b/i],
  ["holistic", /\bholistic\b/i],
  ["detox", /\bdetox\b/i],
  ["weight-loss", /\bweight-loss\b/i],
  ["healing", /\bhealing\b/i],
  ["therapy", /\btherapy\b/i],
  ["triggered", /\btriggered\b/i],
  ["dysregulated", /\bdysregulated\b/i],
  ["reactive", /\breactive\b/i],
  ["activated", /\bactivated\b/i],
  ["trauma", /\btrauma\b/i],
  ["diagnosis", /\bdiagnosis\b/i],
  ["GeoLab", /\bgeolab(?: studio)?\b/i],
  ["Apollo", /\bapollo\b/i],
  ["Clay", /\bclay\b/i],
];

/** Confirmed facts may stay. Spring 2027, boardroom, and resort are not in the source of truth yet. */
const PENDING_FACT: Array<[string, RegExp]> = [
  ["Spring 2027", /\bSpring 2027\b/],
  ["boardroom", /\bboardroom\b/i],
  ["resort", /\bresort\b/i],
];

export function humanizerCheck(subject: string, body: string): HumanizerResult {
  const notes: string[] = [];
  const text = `${subject}\n${body}`;
  for (const [label, pattern] of BANNED) {
    if (pattern.test(text)) notes.push(`The draft uses ${label}.`);
  }
  for (const [label, pattern] of PENDING_FACT) {
    if (pattern.test(text)) notes.push(`${label} is not confirmed, so this letter cannot be approved.`);
  }
  if (/\bnot\b[^.\n]{0,80}\bbut\b/i.test(text) || /\bnot\b[^.\n]{0,40}\.\s*Not\b/.test(text)) {
    notes.push("The letter uses a not-this-but-that contrast.");
  }
  if (/\bteams of \d+ to \d+\b/i.test(text) || /\bheadcount\b/i.test(text)) {
    notes.push("The letter speaks a headcount band as a sentence.");
  }
  if (draftHasPrice(text)) notes.push("The draft has a price.");
  if (draftSellsCanyon(text)) notes.push("The draft sells a canyon product.");
  if (/\bPeople team\b/.test(text) || /\bHi HR\b/i.test(text)) notes.push("The letter greets a department.");
  if (/^\s*[-*•]\s+/m.test(body)) notes.push("The letter is a list. Write prose.");
  if (!/\bI\b/.test(body) || !/\bChristopher\b/.test(body)) {
    notes.push("The letter should be from Christopher, in the first person.");
  }
  if (!/\bI (?:read this about|was looking at)\b/.test(body) && !/\bat [A-Z]/.test(body)) {
    notes.push("The letter needs one specific reference to this company or role.");
  }
  const words = wordCount(letterForWordCount(body));
  if (words < 120 || words > 180) notes.push(`House voice is 120 to 180 words. This is ${words}.`);
  return { pass: notes.length === 0, notes };
}
