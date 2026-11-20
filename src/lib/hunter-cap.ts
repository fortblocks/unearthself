/**
 * Hunter's daily output is contact-ready cards. There is no daily model-call cap.
 * The monthly dollar cap is the spend guardrail.
 * A contact-ready card has a name, a title, an email, and an Enriched mark with a sourced fact.
 * A no-signal card, and a contact flagged Stale, are not contact-ready.
 */

import { HUNTER_DAILY_CARD_TARGET } from "../data/hunter-profile.ts";
import type { Company, EnrichmentState } from "./lead-score.ts";

const ROLE_NAMES = new Set([
  "hr",
  "people",
  "team",
  "people team",
  "human resources",
  "talent team",
  "people and culture",
]);

export type HunterDayCounts = {
  filedOn: string;
  filedToday: number;
  callsOn: string;
  callsToday: number;
};

export function countsForToday(state: HunterDayCounts, today: string) {
  return {
    filedToday: state.filedOn === today ? state.filedToday : 0,
    callsToday: state.callsOn === today ? state.callsToday : 0,
  };
}

/** The day stops when the contact-ready ceiling is filed. Model calls do not stop it. */
export function hunterStop(
  state: HunterDayCounts,
  today: string,
  cardTarget = HUNTER_DAILY_CARD_TARGET,
): "cards" | null {
  const counts = countsForToday(state, today);
  if (counts.filedToday >= cardTarget) return "cards";
  return null;
}

export function applyHunterWork<T extends HunterDayCounts>(
  state: T,
  today: string,
  added: { calls: number; contactReady: number },
): T {
  const counts = countsForToday(state, today);
  return {
    ...state,
    filedOn: today,
    filedToday: counts.filedToday + Math.max(0, added.contactReady),
    callsOn: today,
    callsToday: counts.callsToday + Math.max(0, added.calls),
  };
}

function httpUrl(url: string | undefined) {
  return /^https?:\/\//i.test((url ?? "").trim());
}

export function hasBuyerContact(input: {
  buyerName: string;
  buyerTitle: string;
  email: string;
  emailSource: string;
  contactSource?: "Apollo" | "Public page";
  apolloPersonId?: string;
  apolloEmailStatus?: string;
}) {
  const name = input.buyerName.trim();
  if (!name || ROLE_NAMES.has(name.toLowerCase())) return false;
  if (name.split(/\s+/).filter(Boolean).length < 2) return false;
  if (input.buyerTitle.trim().length < 2) return false;
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (input.contactSource === "Apollo") {
    if (!input.apolloPersonId?.trim()) return false;
    if (input.apolloEmailStatus?.trim().toLowerCase() !== "verified") return false;
    return input.emailSource.trim().length > 0;
  }
  return httpUrl(input.emailSource);
}

function hasSourcedFact(input: {
  contactSource?: "Apollo" | "Public page";
  apolloPersonId?: string;
  apolloEmailStatus?: string;
  profileHits?: { sourceUrl: string }[];
  signals?: { sourceUrl: string }[];
  whySources?: { url: string }[];
}) {
  if (
    input.contactSource === "Apollo" &&
    input.apolloPersonId?.trim() &&
    input.apolloEmailStatus?.trim().toLowerCase() === "verified"
  ) {
    return true;
  }
  if ((input.profileHits ?? []).some((hit) => httpUrl(hit.sourceUrl))) return true;
  if ((input.signals ?? []).some((signal) => httpUrl(signal.sourceUrl))) return true;
  return (input.whySources ?? []).some((source) => httpUrl(source.url));
}

export function assignEnrichment<T extends Company>(company: T, today: string): T {
  if (!hasBuyerContact(company)) {
    return { ...company, enrichment: "not-enriched" satisfies EnrichmentState };
  }
  if (hasSourcedFact(company)) {
    const keepDate = company.enrichment === "enriched" && company.enrichmentOn ? company.enrichmentOn : today;
    return { ...company, enrichment: "enriched" satisfies EnrichmentState, enrichmentOn: keepDate };
  }
  const keepDate = company.enrichment === "no-signal" && company.enrichmentOn ? company.enrichmentOn : today;
  return { ...company, enrichment: "no-signal" satisfies EnrichmentState, enrichmentOn: keepDate };
}

/** Enriched needs a sourced fact. No-signal is not contact-ready. */
export function isContactReady(company: {
  buyerName: string;
  buyerTitle: string;
  email: string;
  emailSource: string;
  contactSource?: "Apollo" | "Public page";
  apolloPersonId?: string;
  apolloEmailStatus?: string;
  enrichment?: EnrichmentState;
  profileHits?: { sourceUrl: string }[];
  signals?: { sourceUrl: string }[];
  whySources?: { url: string }[];
  cardFlags?: string[];
}) {
  if (!hasBuyerContact(company)) return false;
  if (company.cardFlags?.includes("Stale")) return false;
  if (company.enrichment === "no-signal") return false;
  if (company.enrichment === "enriched") return hasSourcedFact(company);
  return false;
}

export function countContactReadyGain(before: Company[], after: Company[]) {
  const prior = new Map(before.map((company) => [company.domain, isContactReady(company)]));
  const seen = new Set<string>();
  let gain = 0;
  for (const company of after) {
    if (!company.domain || seen.has(company.domain)) continue;
    seen.add(company.domain);
    if (isContactReady(company) && !prior.get(company.domain)) gain += 1;
  }
  return gain;
}
