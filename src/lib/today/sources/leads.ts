import { SEED_LEADS, type LeadSource } from "../../../data/desk.ts";
import { sectionSources } from "../registry.ts";
import { sectionError } from "../load.ts";
import type { LeadDirection, SectionResult, SourceMode } from "../types.ts";

export type DeskLead = {
  id: string;
  direction: LeadDirection;
  org: string;
  contact: string;
  owner: "Lisa" | "Tess" | "Norah" | "Christopher";
  status: string;
  next: string;
  dates: string;
};

const OWNER = {
  lisa: "Lisa",
  tess: "Tess",
  norah: "Norah",
  christopher: "Christopher",
} as const;

/** Sample classification until the outbound CRM sends direction itself. Scout is outbound. The rest came in. */
export function leadDirection(source: LeadSource): LeadDirection {
  return source === "scout" ? "outbound" : "inbound";
}

export function sampleLeads(): DeskLead[] {
  return SEED_LEADS.map((lead) => ({
    id: lead.id,
    direction: leadDirection(lead.source),
    org: lead.org,
    contact: lead.contact,
    owner: OWNER[lead.owner],
    status: lead.status,
    next: lead.next,
    dates: lead.dates,
  }));
}

const LIVE_ERROR = "Leads are not connected. The outbound CRM can replace this source later.";

export async function fetchLeads(mode: SourceMode = sectionSources.leads): Promise<SectionResult<DeskLead[]>> {
  if (mode === "live") return { ok: false, mode, error: LIVE_ERROR };
  try {
    return { ok: true, mode: "sample", data: sampleLeads() };
  } catch (error) {
    return { ok: false, mode: "sample", error: sectionError(error, "Sample leads failed.") };
  }
}
