import { DROP_REASONS, type DropReason, type HunterFunnel } from "./hunter-phase.ts";

/** Plain labels for the desk. The stored reason key stays in the run record. */
export const DROP_LABELS: Record<DropReason, string> = {
  "page-empty": "empty page",
  "fetch-failed": "page could not be fetched",
  blocked: "page blocked",
  "timed-out": "timed out",
  "name-missing": "no person named",
  "domain-mismatch": "domain did not match",
  "place-mismatch": "place did not match",
  "do-not-contact": "do not contact",
  duplicate: "already in the book (duplicate)",
  "below-quality-floor": "below the quality floor",
  "no-mx": "no MX record",
  unverified: "email not verified",
};

/**
 * One sentence for a run that stored a funnel. Null when the record has no funnel,
 * which is how older runs are left unchanged.
 */
export function formatFunnelDrops(funnel: Pick<HunterFunnel, "drops"> | null | undefined): string | null {
  if (!funnel) return null;
  const parts: string[] = [];
  for (const reason of DROP_REASONS) {
    const count = funnel.drops?.[reason];
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) continue;
    parts.push(`${count} ${DROP_LABELS[reason]}`);
  }
  if (parts.length === 0) return "No drops recorded";
  return `Dropped: ${parts.join(", ")}`;
}
