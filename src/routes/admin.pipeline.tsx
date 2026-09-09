import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/desk/Chip";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PARTNERS, type Lead, type LeadKind, type LeadStatus, type Partner } from "@/data/desk";
import { cad } from "@/lib/format";
import { openPipeline, partnerFirst, partnerName, useDesk, weightedPipeline } from "@/lib/desk-store";

export const Route = createFileRoute("/admin/pipeline")({
  component: PipelinePage,
  head: () => ({ meta: [{ title: "Pipeline — Unearth Self Desk" }] }),
});

const STATUSES: LeadStatus[] = ["new", "hold", "proposal", "won", "lost"];
const KINDS: Array<LeadKind | "all"> = ["all", "bootcamp", "haven", "basecamp"];

function PipelinePage() {
  const leads = useDesk((s) => s.leads);
  const lookingAs = useDesk((s) => s.lookingAs);
  const addLead = useDesk((s) => s.addLead);
  const setLeadStatus = useDesk((s) => s.setLeadStatus);
  const open = openPipeline(leads);
  const [show, setShow] = useState(false);
  const [mine, setMine] = useState(false);
  const [kind, setKind] = useState<LeadKind | "all">("all");
  const [status, setStatus] = useState<LeadStatus | "all">("all");

  const filtered = leads.filter((l) => {
    if (mine && l.owner !== lookingAs) return false;
    if (kind !== "all" && l.kind !== kind) return false;
    if (status !== "all" && l.status !== status) return false;
    return true;
  });

  return (
    <div className="grid gap-10">
      <section className="grid gap-6 sm:grid-cols-3">
        <Stat label="Open files" value={String(open.length)} hint="Not won, not lost" />
        <Stat label="Weighted" value={cad(weightedPipeline(leads))} hint="Probability × value" />
        <Stat
          label="On your desk"
          value={String(open.filter((l) => l.owner === lookingAs).length)}
          hint={partnerName(lookingAs)}
        />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={mine} onClick={() => setMine((v) => !v)}>
          Mine
        </Chip>
        {KINDS.map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {k === "all" ? "All kinds" : k}
          </Chip>
        ))}
        <div className="ml-auto">
          <Button type="button" onClick={() => setShow((v) => !v)}>
            {show ? "Close form" : "New enquiry"}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(["all", ...STATUSES] as const).map((st) => (
          <Chip key={st} active={status === st} onClick={() => setStatus(st)}>
            {st === "all" ? "All status" : st}
          </Chip>
        ))}
      </div>

      {show ? (
        <NewLeadForm
          onDone={() => setShow(false)}
          addLead={(input) => {
            addLead(input);
            toast(`Filed ${input.org}`);
          }}
          defaultOwner={lookingAs}
        />
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-muted">Nothing matches. Clear a filter.</p>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((l) => (
            <LeadCard
              key={l.id}
              lead={l}
              mine={l.owner === lookingAs}
              onStatus={(st) => {
                setLeadStatus(l.id, st);
                toast(`${l.org} → ${st}`);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LeadCard({
  lead,
  mine,
  onStatus,
}: {
  lead: Lead;
  mine: boolean;
  onStatus: (st: LeadStatus) => void;
}) {
  return (
    <li
      className={
        mine
          ? "grid gap-3 border border-line border-l-2 border-l-coal bg-paper p-4 md:grid-cols-[1fr_auto] md:items-start"
          : "grid gap-3 border border-line bg-paper p-4 md:grid-cols-[1fr_auto] md:items-start"
      }
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={lead.kind}>{lead.kind}</Badge>
          <span className="text-xs tabular-nums text-muted">{lead.id}</span>
        </div>
        <h2 className="mt-2 font-display text-3xl font-black uppercase leading-none">{lead.org}</h2>
        <p className="mt-2 text-sm text-muted">
          {lead.contact} · {lead.dates} · {lead.headcount} head
        </p>
        <p className="mt-2 text-sm">
          <span className="tabular-nums font-semibold">{cad(lead.value)}</span>
          <span className="text-muted"> · {Math.round(lead.weight * 100)}% · {partnerFirst(lead.owner)}</span>
        </p>
        <p className="mt-3 text-sm">
          <span className="text-sandstone">Next · </span>
          {lead.next}
        </p>
        {lead.note ? <p className="mt-2 max-w-prose text-sm text-pretty text-muted">{lead.note}</p> : null}
      </div>
      <NativeSelect
        value={lead.status}
        onChange={(e) => onStatus(e.target.value as LeadStatus)}
        aria-label={`Status for ${lead.org}`}
        className="w-full md:w-40"
      >
        {STATUSES.map((st) => (
          <option key={st} value={st}>
            {st}
          </option>
        ))}
      </NativeSelect>
    </li>
  );
}

function NewLeadForm({
  onDone,
  addLead,
  defaultOwner,
}: {
  onDone: () => void;
  defaultOwner: Partner;
  addLead: (input: {
    org: string;
    contact: string;
    kind: LeadKind;
    headcount: number;
    value: number;
    dates: string;
    owner: Partner;
  }) => void;
}) {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    addLead({
      org: String(data.get("org") || "Untitled"),
      contact: String(data.get("contact") || ""),
      kind: (data.get("kind") as LeadKind) || "bootcamp",
      headcount: Number(data.get("headcount") || 6),
      value: Number(data.get("value") || 0),
      dates: String(data.get("dates") || ""),
      owner: (data.get("owner") as Partner) || defaultOwner,
    });
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 border border-line bg-paper p-5 md:grid-cols-2">
      <label>
        <Label>Organisation</Label>
        <Input name="org" required placeholder="Who is coming" />
      </label>
      <label>
        <Label>Contact</Label>
        <Input name="contact" required placeholder="Name and role" />
      </label>
      <label>
        <Label>Kind</Label>
        <NativeSelect name="kind">
          <option value="bootcamp">Bootcamp</option>
          <option value="haven">Haven</option>
          <option value="basecamp">Basecamp</option>
        </NativeSelect>
      </label>
      <label>
        <Label>Owner</Label>
        <NativeSelect name="owner" defaultValue={defaultOwner}>
          {PARTNERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label>
        <Label>Headcount</Label>
        <Input name="headcount" type="number" min={1} max={30} defaultValue={8} />
      </label>
      <label>
        <Label>Value CAD</Label>
        <Input name="value" type="number" min={0} defaultValue={18000} />
      </label>
      <label className="md:col-span-2">
        <Label>Dates</Label>
        <Input name="dates" placeholder="e.g. 12–14 Nov" />
      </label>
      <div className="md:col-span-2">
        <Button type="submit">File it</Button>
      </div>
    </form>
  );
}
