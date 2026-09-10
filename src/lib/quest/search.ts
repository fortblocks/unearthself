export type BeatSearch = { beat?: string };

export function beatSearch(s: Record<string, unknown>): BeatSearch {
  return { beat: typeof s.beat === "string" ? s.beat : undefined };
}
