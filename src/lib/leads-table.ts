export type LeadSortKey = "company" | "place" | "size" | "score";
export type LeadSortDir = "asc" | "desc";

export type LeadSort = {
  key: LeadSortKey;
  dir: LeadSortDir;
};

export const DEFAULT_LEAD_SORT: LeadSort = { key: "score", dir: "desc" };

type SortableLead = {
  company: {
    id: string;
    org: string;
    city: string;
    place?: string;
    sizeBand: string;
    hunterScore?: number | null;
  };
  score: { total: number; fit?: number };
};

export type DeskScoreField = "hunterScore" | "fit" | "total";

/** Hunter's filed score first. A card without one uses the lead-score fit, then the lead-score total. */
export function deskScoreRank(row: SortableLead): { value: number; field: DeskScoreField } {
  const hunter = row.company.hunterScore;
  if (typeof hunter === "number" && Number.isFinite(hunter)) return { value: hunter, field: "hunterScore" };
  if (typeof row.score.fit === "number" && Number.isFinite(row.score.fit)) return { value: row.score.fit, field: "fit" };
  return { value: row.score.total, field: "total" };
}

/** First number in a size band. "80-800" is 80. "1500+" is 1500. Unknown has no bound. */
export function sizeLowerBound(sizeBand: string): number | null {
  const match = sizeBand.trim().match(/\d+/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function leadPlace(company: { place?: string; city: string }) {
  return company.place?.trim() || company.city;
}

function textCompare(left: string, right: string) {
  return left.localeCompare(right, "en-CA", { sensitivity: "base" });
}

/** Clicking the active column flips direction. A new text column starts A to Z. A new number column starts high to low. */
export function nextLeadSort(current: LeadSort, key: LeadSortKey): LeadSort {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: key === "company" || key === "place" ? "asc" : "desc" };
}

export function sortLeadRows<T extends SortableLead>(rows: T[], sort: LeadSort): T[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.key === "size") {
      const left = sizeLowerBound(a.company.sizeBand);
      const right = sizeLowerBound(b.company.sizeBand);
      if (left == null || right == null) {
        if (left == null && right == null) return textCompare(a.company.org, b.company.org) || a.company.id.localeCompare(b.company.id);
        return left == null ? 1 : -1;
      }
      if (left !== right) return (left - right) * factor;
    } else {
      const diff =
        sort.key === "company"
          ? textCompare(a.company.org, b.company.org)
          : sort.key === "place"
            ? textCompare(leadPlace(a.company), leadPlace(b.company))
            : deskScoreRank(a).value - deskScoreRank(b).value;
      if (diff !== 0) return diff * factor;
    }
    return textCompare(a.company.org, b.company.org) || a.company.id.localeCompare(b.company.id);
  });
}
