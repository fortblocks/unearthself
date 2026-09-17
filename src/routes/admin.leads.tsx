import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/desk/Chip";
import { Section } from "@/components/desk/Section";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { companyStats, useDesk } from "@/lib/desk-store";
import { draftProblems, wordCount } from "@/lib/lead-copy";
import {
  bandLabel,
  hasAccess,
  isSendable,
  scoreCompany,
  type Company,
  type Industry,
  type LeadCity,
  type ScoreBand,
} from "@/lib/lead-score";

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
  validateSearch: (s: Record<string, unknown>): { company?: string } => {
    const company = typeof s.company === "string" && s.company ? s.company : undefined;
    return company ? { company } : {};
  },
  head: () => ({ meta: [{ title: "Leads — Unearth Self Desk" }] }),
});

const SEND_ERR: Record<string, string> = {
  missing: "That card is not on the list.",
  closed: "Stopped. Do not email.",
  paused: "Corporate AE is paused.",
  access: "Send blocked. Named person, published email, and source URL.",
  band: "Band says do not email, or watch only.",
  unsourced: "Email without a source URL is not published. Do not invent it.",
  copy: "Draft fails house voice.",
};

const CITIES: Array<LeadCity | "all"> = ["all", "Calgary", "Edmonton", "Red Deer", "Alberta"];
const BANDS: Array<ScoreBand | "all"> = ["all", "pursue", "sequence", "watch", "hold"];
const INDUSTRIES: Array<Industry | "all"> = [
  "all",
  "energy",
  "construction",
  "professional",
  "engineering",
  "logistics",
  "healthcare",
  "education",
  "civic",
  "tech",
];

function LeadsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const companies = useDesk((s) => s.companies);
  const threads = useDesk((s) => s.threads);
  const ingestScout = useDesk((s) => s.ingestScout);
  const generateCompanyDraft = useDesk((s) => s.generateCompanyDraft);
  const saveCompanyDraft = useDesk((s) => s.saveCompanyDraft);
  const approveCompanyDraft = useDesk((s) => s.approveCompanyDraft);
  const sendCompany = useDesk((s) => s.sendCompany);
  const stopCompany = useDesk((s) => s.stopCompany);
  const fileCompany = useDesk((s) => s.fileCompany);
  const setCompanyAccess = useDesk((s) => s.setCompanyAccess);
  const stats = companyStats(companies);
  const [city, setCity] = useState<LeadCity | "all">("all");
  const [band, setBand] = useState<ScoreBand | "all">("all");
  const [industry, setIndustry] = useState<Industry | "all">("all");
  const [sendableOnly, setSendableOnly] = useState(false);
  const [q, setQ] = useState("");
  const [showIngest, setShowIngest] = useState(false);
  const [activeId, setActiveId] = useState(search.company || "");

  const ranked = useMemo(() => {
    return companies
      .map((c) => ({ c, s: scoreCompany(c) }))
      .sort((a, b) => b.s.total - a.s.total || a.c.org.localeCompare(b.c.org));
  }, [companies]);

  const filtered = ranked.filter(({ c, s }) => {
    if (city !== "all" && c.city !== city) return false;
    if (band !== "all" && s.band !== band) return false;
    if (industry !== "all" && c.industry !== industry) return false;
    if (sendableOnly && !isSendable(c, s)) return false;
    if (q) {
      const hay = `${c.org} ${c.domain} ${c.why} ${c.buyerName}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const active = companies.find((c) => c.id === activeId) ?? filtered[0]?.c ?? companies[0];
  const activeScore = active ? scoreCompany(active) : null;
  const mail = active ? threads.filter((m) => m.companyId === active.id) : [];

  return (
    <div className="grid gap-10">
      <p className="max-w-prose text-pretty text-muted">
        Long list of companies. Not the pipeline. Score 100 = Fit 60 + Access 25 + Timing 15.
        Calgary / Edmonton / Red Deer, headcount 80–800, first-wave industries. Send needs a named
        person, a published email, and a source URL. No Apollo. No invented emails. Gmail is not
        connected — send opens mailto and logs the thread.
      </p>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="List" value={String(stats.list)} hint="Research cards" />
        <Stat label="Sendable" value={String(stats.sendable)} hint="Access + 70+" />
        <Stat label="In sequence" value={String(stats.sequence)} hint="Draft approved, not filed" />
        <Stat label="Stopped" value={String(stats.stopped)} hint="Do not email" />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {CITIES.map((c) => (
          <Chip key={c} active={city === c} onClick={() => setCity(c)}>
            {c === "all" ? "All cities" : c}
          </Chip>
        ))}
        <Chip active={sendableOnly} onClick={() => setSendableOnly((v) => !v)}>
          Sendable
        </Chip>
        <div className="ml-auto">
          <Button type="button" variant="outline" onClick={() => setShowIngest((v) => !v)}>
            {showIngest ? "Close ingest" : "Scout ingest"}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {BANDS.map((b) => (
          <Chip key={b} active={band === b} onClick={() => setBand(b)}>
            {b === "all" ? "All bands" : bandLabel(b)}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {INDUSTRIES.map((i) => (
          <Chip key={i} active={industry === i} onClick={() => setIndustry(i)}>
            {i === "all" ? "All industries" : i}
          </Chip>
        ))}
      </div>

      <label className="max-w-md">
        <Label>Find</Label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Org, domain, buyer" />
      </label>

      {showIngest ? (
        <IngestForm
          onDone={(msg) => {
            setShowIngest(false);
            toast(msg);
          }}
          ingest={ingestScout}
        />
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-muted">Nothing matches. Clear a filter.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <Section kicker={`${filtered.length} on the list`}>
            <ul className="divide-y divide-line border-y border-line">
              {filtered.map(({ c, s }) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(c.id);
                      void navigate({ search: { company: c.id } });
                    }}
                    className={
                      c.id === active?.id
                        ? "flex w-full flex-col items-start gap-1 py-3 text-left"
                        : "flex w-full flex-col items-start gap-1 py-3 text-left text-muted"
                    }
                  >
                    <span className="font-semibold">{c.org}</span>
                    <span className="text-xs tabular-nums">
                      {s.total} · {c.city} · {c.industry}
                      {isSendable(c, s) ? " · sendable" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          {active && activeScore ? (
            <CompanyPanel
              key={active.id}
              company={active}
              score={activeScore}
              mail={mail}
              onGenerate={() => {
                const err = generateCompanyDraft(active.id);
                if (err) toast(SEND_ERR[err] ?? err);
                else toast("House-voice draft on the card");
              }}
              onSave={(subject, body) => {
                const err = saveCompanyDraft(active.id, subject, body);
                if (err) toast(SEND_ERR[err] ?? err);
                else toast("Draft saved");
              }}
              onApprove={() => {
                const err = approveCompanyDraft(active.id);
                if (err) toast(SEND_ERR[err] ?? err);
                else toast("Approved · on the thread");
              }}
              onSend={() => {
                const err = sendCompany(active.id);
                if (err) toast(SEND_ERR[err] ?? err);
                else toast("Logged · mailto opened");
              }}
              onStop={() => {
                stopCompany(active.id);
                toast("Stopped. Do not email.");
              }}
              onFile={() => {
                const id = fileCompany(active.id);
                if (id) toast(`Filed on pipeline · ${id}`);
              }}
              onAccess={(input) => {
                const err = setCompanyAccess(active.id, input);
                if (err) toast(SEND_ERR[err] ?? err);
                else toast("Access updated. Email only if sourced.");
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function CompanyPanel({
  company,
  score,
  mail,
  onGenerate,
  onSave,
  onApprove,
  onSend,
  onStop,
  onFile,
  onAccess,
}: {
  company: Company;
  score: ReturnType<typeof scoreCompany>;
  mail: { id: string; dir: string; bot: string; subject: string; body: string }[];
  onGenerate: () => void;
  onSave: (subject: string, body: string) => void;
  onApprove: () => void;
  onSend: () => void;
  onStop: () => void;
  onFile: () => void;
  onAccess: (input: {
    buyerName: string;
    buyerTitle: string;
    email: string;
    emailSource: string;
    sourceUrl: string;
  }) => void;
}) {
  const [subject, setSubject] = useState(company.draftSubject);
  const [body, setBody] = useState(company.draftBody);
  useEffect(() => {
    setSubject(company.draftSubject);
    setBody(company.draftBody);
  }, [company.id, company.draftSubject, company.draftBody]);
  const sendable = isSendable(company, score);
  const access = hasAccess(company);
  const problems = draftProblems(body);
  const words = wordCount(body);

  return (
    <div className="grid gap-6">
      <div className="border border-line border-l-2 border-l-coal bg-paper p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={score.band === "pursue" ? "bootcamp" : score.band === "sequence" ? "proposal" : score.band === "watch" ? "hold" : "lost"}>
            {bandLabel(score.band)}
          </Badge>
          <Badge tone={company.status === "filed" ? "won" : company.status === "stopped" ? "lost" : company.status === "sequence" ? "proposal" : "new"}>
            {company.status}
          </Badge>
          <span className="text-xs tabular-nums text-muted">{company.id}</span>
        </div>
        <h2 className="mt-2 font-display text-4xl font-black uppercase leading-none">{company.org}</h2>
        <p className="mt-2 text-sm text-muted">
          {company.city} · {company.industry} · {company.sizeBand} · {company.domain}
        </p>
        <p className="mt-2 text-sm">
          <span className="tabular-nums font-semibold">{score.total}</span>
          <span className="text-muted">
            {" "}
            · Fit {score.fit}/60 · Access {score.access}/25 · Timing {score.timing}/15
          </span>
        </p>
        <p className="mt-3 max-w-prose text-sm text-pretty">{company.why}</p>
        <p className="mt-2 text-sm text-muted">{company.timingNote}</p>
        <p className="mt-3 text-sm">
          {company.buyerName ? (
            <>
              {company.buyerName}
              {company.buyerTitle ? ` · ${company.buyerTitle}` : ""}
              {company.email ? ` · ${company.email}` : " · no published email"}
            </>
          ) : (
            <span className="text-sandstone">No named buyer. Draft allowed. Send blocked.</span>
          )}
        </p>
        {company.sourceUrl ? (
          <p className="mt-2">
            <a
              href={company.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-ember hover:underline"
            >
              Source
            </a>
            {company.emailSource ? (
              <>
                <span className="text-muted"> · </span>
                <a
                  href={company.emailSource}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-ember hover:underline"
                >
                  Email source
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        <AccessForm company={company} onAccess={onAccess} />

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={onGenerate}>
            House-voice draft
          </Button>
          <Button type="button" variant="outline" onClick={onApprove} disabled={problems.length > 0}>
            Approve to thread
          </Button>
          <Button type="button" variant="outline" onClick={onSend} disabled={!sendable || problems.length > 0}>
            Send
          </Button>
          <Button type="button" variant="outline" onClick={onFile} disabled={company.status === "filed"}>
            Hand file
          </Button>
          <Button type="button" variant="outline" onClick={onStop}>
            Stop
          </Button>
          {company.filedLeadId ? (
            <Link
              to="/admin/pipeline"
              className="inline-flex min-h-11 items-center justify-center rounded-xs border border-line-strong px-4 text-sm font-semibold text-coal hover:border-coal"
            >
              Pipeline {company.filedLeadId}
            </Link>
          ) : null}
        </div>
        {!access ? (
          <p className="mt-3 text-sm text-sandstone">
            Access incomplete. You may draft. You may not send. Cite a person and a published inbox
            with a URL — do not guess.
          </p>
        ) : null}
      </div>

      <Section kicker={`Draft tray · ${words} words`}>
        <form
          className="grid gap-3 border border-line bg-paper p-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(subject, body);
          }}
        >
          <label>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label>
            <Label>Body</Label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="min-h-40 w-full resize-y rounded-sm border border-line bg-paper px-3 py-2 text-sm text-coal outline-none focus:border-coal"
            />
          </label>
          {problems.length ? (
            <ul className="list-disc pl-5 text-sm text-ember">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">120–180 words. No price. No canyon product until D13.</p>
          )}
          <div>
            <Button type="submit" variant="outline">
              Save draft
            </Button>
          </div>
        </form>
      </Section>

      <Section kicker="Thread">
        {mail.length === 0 ? (
          <p className="text-sm text-muted">No mail yet. Approve puts a draft on the thread.</p>
        ) : (
          <ul className="grid gap-3">
            {mail.map((m) => (
              <li key={m.id} className="border border-line bg-paper p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={m.dir === "out" ? "sent" : m.dir === "in" ? "won" : m.dir === "draft" ? "hold" : "new"}>
                    {m.dir}
                  </Badge>
                  <span className="text-xs uppercase tracking-widest text-muted">{m.bot}</span>
                </div>
                <p className="mt-2 font-semibold">{m.subject}</p>
                <p className="mt-2 max-w-prose whitespace-pre-wrap text-sm text-pretty text-shale">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function AccessForm({
  company,
  onAccess,
}: {
  company: Company;
  onAccess: (input: {
    buyerName: string;
    buyerTitle: string;
    email: string;
    emailSource: string;
    sourceUrl: string;
  }) => void;
}) {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onAccess({
      buyerName: String(data.get("buyerName") || ""),
      buyerTitle: String(data.get("buyerTitle") || ""),
      email: String(data.get("email") || ""),
      emailSource: String(data.get("emailSource") || ""),
      sourceUrl: String(data.get("sourceUrl") || company.sourceUrl),
    });
  }
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
      <p className="md:col-span-2 text-xs tracking-widest text-sandstone uppercase">Cite access — never invent</p>
      <label>
        <Label>Named buyer</Label>
        <Input name="buyerName" defaultValue={company.buyerName} placeholder="First and last, from a page" />
      </label>
      <label>
        <Label>Title</Label>
        <Input name="buyerTitle" defaultValue={company.buyerTitle} placeholder="People / HR" />
      </label>
      <label>
        <Label>Published email</Label>
        <Input name="email" type="email" defaultValue={company.email} placeholder="Only if it is on a URL" />
      </label>
      <label>
        <Label>Email source URL</Label>
        <Input name="emailSource" defaultValue={company.emailSource} placeholder="https://…" />
      </label>
      <label className="md:col-span-2">
        <Label>Company source URL</Label>
        <Input name="sourceUrl" defaultValue={company.sourceUrl} />
      </label>
      <div>
        <Button type="submit" variant="outline">
          Save access
        </Button>
      </div>
    </form>
  );
}

function IngestForm({
  ingest,
  onDone,
}: {
  ingest: (raw: string) => { added: number; merged: number; skipped: number; error: string | null };
  onDone: (msg: string) => void;
}) {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const raw = String(data.get("json") || "");
    const result = ingest(raw);
    if (result.error) {
      toast(result.error);
      return;
    }
    onDone(`Ingested ${result.added} new, merged ${result.merged}, skipped ${result.skipped}. Deduped on domain.`);
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 border border-line bg-paper p-5">
      <p className="max-w-prose text-sm text-pretty text-muted">
        Paste JSON from the Lead Scout automation. Array, single object, or{" "}
        <span className="font-semibold">{"{ companies: [] }"}</span>. Fields: domain, city, industry,
        sizeBand, sourceUrl, why, buyer if cited. Emails without a source URL are dropped. Dedupes on
        domain.
      </p>
      <label>
        <Label>JSON</Label>
        <textarea
          name="json"
          required
          rows={10}
          placeholder={`[\n  {\n    "domain": "example.com",\n    "city": "Calgary",\n    "industry": "energy",\n    "sizeBand": "80-800",\n    "sourceUrl": "https://example.com/about",\n    "why": "Teams of 12–20. Banff is the default.",\n    "buyer": { "name": "Alex Reid", "title": "VP People", "email": "people@example.com", "emailSource": "https://example.com/contact" }\n  }\n]`}
          className="min-h-40 w-full resize-y rounded-sm border border-line bg-paper px-3 py-2 font-mono text-sm text-coal outline-none focus:border-coal"
        />
      </label>
      <div>
        <Button type="submit">File the batch</Button>
      </div>
    </form>
  );
}
