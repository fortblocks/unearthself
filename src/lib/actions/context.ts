import { formatDateOrdinal, normalizeBasecamp, shortenPartnerNames } from "../minutes-archive.ts";

/** One source sentence. Longer notes are cut on a word boundary, not rewritten. */
export const CONTEXT_WORD_LIMIT = 25;

/**
 * Turn an action line's own detail (the text after the first colon) into one
 * plain sentence. Partners are first names only. Returns undefined when the
 * notes have no detail — callers must not invent a sentence.
 */
export function contextSentenceFromDetail(detail: string): string | undefined {
  let text = detail.replace(/\s+/g, " ").trim();
  if (!text) return undefined;

  text = text.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDateOrdinal(match));
  text = shortenPartnerNames(text);
  text = text.replace(/\bChris\b/g, "Christopher");
  text = normalizeBasecamp(text);
  text = text.replace(/\s+/g, " ").trim();

  const sentenceMatch = text.match(/^[\s\S]*?[.!?]+(?=\s|$)/);
  let sentence = (sentenceMatch ? sentenceMatch[0] : text).trim();
  if (!sentence) return undefined;

  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  if (words.length > CONTEXT_WORD_LIMIT) {
    sentence = `${words.slice(0, CONTEXT_WORD_LIMIT).join(" ")}.`;
  }
  return sentence;
}
