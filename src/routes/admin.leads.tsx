import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/desk/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDesk } from "@/lib/desk-store";
import {
  cocoAwaitingDraft,
  COCO_DRAFT_POLL_MS,
  companiesOnDesk,
  draftPollDecision,
  emptyCoco,
  LeadCardActions,
} from "@/lib/lead-card-view";
import type { CocoJoin } from "@/lib/hunter-outreach";
import {
  clampMorningCount,
  DESK_STORAGE_KEY,
  morningCompanies,
  readLocalCompanies,
  type MorningBatch,
} from "@/lib/leads-book";
import { getLeadsBook, importLeadsCompanies, saveLeadsCompany, setLeadsMorningCount } from "@/lib/leads-api";
import { addDoNotContact, approveAndQueueForCoco, approveWording, getCocoCard, saveCocoDraftEdit, withdrawWording } from "@/lib/leads-hunter-api";
import { cardSource } from "@/lib/leads-hunter";
import { DEFAULT_LEAD_SORT, nextLeadSort, sortLeadRows, type LeadSortKey } from "@/lib/leads-table";
import {
  bandLabel,
  daysBetween,
  edmontonToday,
  hasAccess,
  isSendable,
  scoreCompany,
  signalContribution,
  type Company,
  type Industry,
  type LeadCity,
  type ScoreBand,
} from "@/lib/lead-score";

const MORNING_LOCAL_KEY = "unearthself-leads-morning-count";

const SEND_ERR: Record<string, string> = {
  missing: "That card is not on the list.",
  closed: "Stopped. Do not email.",
  paused: "Corporate AE is paused.",
  access: "Named person, published email, and source URL are required.",
  band: "Band says do not email, or watch only.",
  unsourced: "Email without a source URL is not published. Do not invent it.",
  copy: "Draft fails house voice.",
};

const CITIES: Array<LeadCity | "all"> = ["all", "Calgary", "Edmonton", "Red Deer", "Alberta", "Elsewhere"];
const ORIGINS = ["all", "scout", "hunter", "hand"] as const;

function originLabel(origin: (typeof ORIGINS)[number]) {
  if (origin === "all") return "All";
  if (origin === "scout") return "Hunter nightly";
  if (origin === "hunter") return "Hunter";
  return "Hand";
}
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
  "other",
];

const fieldClass =
  "h-11 w-full rounded-sm border border-line bg-paper px-3 text-sm text-coal outline-none focus:border-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

export const Route = createFileRoute("/admin/leads")({
  loader: () => getLeadsBook(),
  component: LeadsPage,
  pendingComponent: () => (
    <Section kicker="Leads">
      <div className="border border-line bg-paper p-8 text-center text-sm text-muted">Loading leads.</div>
    </Section>
  ),
  errorComponent: ({ error, reset }) => (
    <Section kicker="Leads">
      <div className="border border-line bg-paper p-8 text-center">
        <p className="text-sm text-coal">{error instanceof Error ? error.message : "Could not load leads."}</p>
        <Button onClick={() => reset()} className="mt-4">
          Try again
        </Button>
      </div>
    </Section>
  ),
  head: () => ({ meta: [{ title: "Leads - Unearth Self Desk" }] }),
});

function LeadsPage() {
  const loaded = Route.useLoaderData();
  const threads = useDesk((s) => s.threads);
  const [rows, setRows] = useState<Company[] | null>(null);
  const [storage, setStorage] = useState<"redis" | "browser" | null>(null);
  const [morningCount, setMorningCount] = useState(10);
  const [morning, setMorning] = useState<MorningBatch | null>(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<LeadCity | "all">("all");
  const [industry, setIndustry] = useState<Industry | "all">("all");
  const [band, setBand] = useState<ScoreBand | "all">("all");
  const [origin, setOrigin] = useState<(typeof ORIGINS)[number]>("all");
  const [openId, setOpenId] = useState("");
  const [cocoById, setCocoById] = useState<Record<string, CocoJoin>>(loaded.coco ?? {});
  const rowsRef = useRef<Company[]>([]);
  rowsRef.current = rows ?? [];
  const today = edmontonToday();

  useEffect(() => {
    let gone = false;
    const run = () => {
      void (async () => {
        if (loaded.storage === "browser") {
          const saved = Number(localStorage.getItem(MORNING_LOCAL_KEY));
          if (gone) return;
          setStorage("browser");
          setMorningCount(clampMorningCount(Number.isFinite(saved) && saved > 0 ? saved : 10));
          setMorning(null);
          setRows(useDesk.getState().companies);
          return;
        }
        let book = loaded.book;
        if (book.companies.length === 0) {
          const local = readLocalCompanies(localStorage.getItem(DESK_STORAGE_KEY));
          if (local.length) {
            book = await importLeadsCompanies({ data: { companies: local } });
          }
        }
        if (gone) return;
        setStorage("redis");
        setMorningCount(book.morningCount);
        setMorning(book.morning);
        if (book.companies.length) {
          const companies = book.companies;
          setRows(companies);
          useDesk.setState({ companies });
          setCocoById(loaded.coco ?? {});
        } else {
          setRows([]);
          useDesk.setState({ companies: [] });
        }
      })().catch((error: unknown) => {
        if (!gone) toast.error(error instanceof Error ? error.message : "Could not load leads");
      });
    };
    const unsub = useDesk.persist.hasHydrated()
      ? () => undefined
      : useDesk.persist.onFinishHydration(() => run());
    if (useDesk.persist.hasHydrated()) run();
    return () => {
      gone = true;
      unsub();
    };
  }, [loaded]);

  const listed = useMemo(
    () =>
      companiesOnDesk(
        rows ?? [],
        today,
        Object.fromEntries(Object.entries(cocoById).map(([id, card]) => [id, card.blocked])),
      ),
    [rows, today, cocoById],
  );

  const scored = useMemo(() => {
    return listed.map((company) => ({
      company,
      score: scoreCompany({ ...company, today }),
    }));
  }, [listed, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scored.filter(({ company, score }) => {
      if (city !== "all" && company.city !== city) return false;
      if (industry !== "all" && company.industry !== industry) return false;
      if (band !== "all" && score.band !== band) return false;
      if (origin !== "all" && cardSource(company) !== origin) return false;
      if (!q) return true;
      return [company.org, company.city, company.domain, company.buyerName, company.email]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [scored, query, city, industry, band, origin]);

  const morningRows = useMemo(() => {
    if (!rows || !morning) return [];
    const ids = new Set(
      morningCompanies({ companies: listed, morningCount, morning, draftRevision: 0 }, today).map((company) => company.id),
    );
    return filtered.filter(({ company }) => ids.has(company.id));
  }, [rows, morning, morningCount, today, filtered, listed]);

  async function persistCard(id: string) {
    const company = useDesk.getState().companies.find((item) => item.id === id);
    if (!company) return;
    if (storage !== "redis") {
      setRows(useDesk.getState().companies);
      return;
    }
    const book = await saveLeadsCompany({ data: { company } });
    setRows(book.companies);
    useDesk.setState({ companies: book.companies });
  }

  async function mutate(id: string, act: () => string | null) {
    useDesk.setState({ companies: rowsRef.current });
    const err = act();
    try {
      await persistCard(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
    if (err) toast.error(SEND_ERR[err] ?? err);
    return err;
  }

  async function changeCount(value: string) {
    const count = clampMorningCount(Number(value));
    setMorningCount(count);
    if (storage === "redis") {
      try {
        const book = await setLeadsMorningCount({ data: { morningCount: count } });
        setMorning(book.morning);
        setMorningCount(book.morningCount);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save the morning count");
      }
      return;
    }
    localStorage.setItem(MORNING_LOCAL_KEY, String(count));
  }

  return (
    <div className="grid gap-10">
      <Section kicker="Leads">
        <div className="grid gap-3 border border-line bg-paper p-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label htmlFor="lead-search">Search</Label>
            <Input id="lead-search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="lead-city">City</Label>
            <select id="lead-city" className={fieldClass} value={city} onChange={(event) => setCity(event.target.value as LeadCity | "all")}>
              {CITIES.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All cities" : item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lead-industry">Industry</Label>
            <select
              id="lead-industry"
              className={fieldClass}
              value={industry}
              onChange={(event) => setIndustry(event.target.value as Industry | "all")}
            >
              {INDUSTRIES.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All industries" : item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lead-band">Score band</Label>
            <select id="lead-band" className={fieldClass} value={band} onChange={(event) => setBand(event.target.value as ScoreBand | "all")}>
              {BANDS.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All bands" : bandLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lead-source">Source</Label>
            <select
              id="lead-source"
              className={fieldClass}
              value={origin}
              onChange={(event) => setOrigin(event.target.value as (typeof ORIGINS)[number])}
            >
              {ORIGINS.map((item) => (
                <option key={item} value={item}>
                  {originLabel(item)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-3 text-sm text-coal">
          Real data only. Every row here was filed by Hunter or added by hand.
        </p>
        {storage === "browser" ? (
          <p className="mt-3 text-sm text-shale">Redis is not connected. Changes stay in this browser.</p>
        ) : null}
      </Section>

      <Section
        kicker="This morning"
        action={
          <label className="flex items-center gap-2 whitespace-nowrap text-xs tracking-widest text-sandstone uppercase">
            How many
            <select className={`${fieldClass} w-20`} value={morningCount} onChange={(event) => void changeCount(event.target.value)} aria-label="How many each morning">
              {Array.from({ length: 11 }, (_, index) => 10 + index).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {rows == null ? (
          <p className="border-y border-line py-4 text-sm text-muted">Loading this morning.</p>
        ) : morningRows.length === 0 ? (
          <p className="border-y border-line py-4 text-sm text-shale">No new leads for this morning.</p>
        ) : (
          <CompanyList
            rows={morningRows}
            openId={openId}
            threads={threads}
            today={today}
            cocoById={cocoById}
            onCoco={(id, card) => setCocoById((current) => ({ ...current, [id]: card }))}
            onToggle={setOpenId}
            onMutate={mutate}
          />
        )}
      </Section>

      <Section kicker="All companies">
        {rows == null ? (
          <p className="border-y border-line py-4 text-sm text-muted">Loading companies.</p>
        ) : rows.length === 0 ? (
          <p className="border-y border-line py-4 text-sm text-shale">No companies filed yet.</p>
        ) : filtered.length === 0 ? (
          <p className="border-y border-line py-4 text-sm text-shale">No companies match.</p>
        ) : (
          <CompanyList
            rows={filtered}
            openId={openId}
            threads={threads}
            today={today}
            cocoById={cocoById}
            onCoco={(id, card) => setCocoById((current) => ({ ...current, [id]: card }))}
            onToggle={setOpenId}
            onMutate={mutate}
          />
        )}
      </Section>
    </div>
  );
}

function SortHeader({
  label,
  column,
  sort,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  column: LeadSortKey;
  sort: { key: LeadSortKey; dir: "asc" | "desc" };
  onSort: (column: LeadSortKey) => void;
  className: string;
  align?: "left" | "right";
}) {
  const active = sort.key === column;
  return (
    <span className={className}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 bg-transparent p-0 text-xs tracking-widest uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${align === "right" ? "w-full justify-end" : ""} ${active ? "text-coal" : "text-sandstone"}`}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        onClick={() => onSort(column)}
      >
        {label}
        {active ? <span aria-hidden="true">{sort.dir === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </span>
  );
}

function CompanyList({
  rows,
  openId,
  threads,
  today,
  cocoById,
  onCoco,
  onToggle,
  onMutate,
}: {
  rows: Array<{ company: Company; score: ReturnType<typeof scoreCompany> }>;
  openId: string;
  threads: Array<{ id: string; companyId?: string; dir: string; subject: string; at: string }>;
  today: string;
  cocoById: Record<string, CocoJoin>;
  onCoco: (id: string, card: CocoJoin) => void;
  onToggle: (id: string) => void;
  onMutate: (id: string, act: () => string | null) => Promise<string | null>;
}) {
  const [sort, setSort] = useState(DEFAULT_LEAD_SORT);
  const ordered = useMemo(() => sortLeadRows(rows, sort), [rows, sort]);
  return (
    <ul className="divide-y divide-line border-y border-line">
      <li className="flex items-center gap-4 py-2 text-xs tracking-widest uppercase">
        <span className="size-2.5 shrink-0" />
        <SortHeader label="Company" column="company" sort={sort} onSort={(column) => setSort((current) => nextLeadSort(current, column))} className="min-w-0 flex-1" />
        <SortHeader label="Place" column="place" sort={sort} onSort={(column) => setSort((current) => nextLeadSort(current, column))} className="hidden w-28 shrink-0 sm:block" />
        <SortHeader label="Size" column="size" sort={sort} onSort={(column) => setSort((current) => nextLeadSort(current, column))} className="hidden w-24 shrink-0 sm:block" />
        <SortHeader label="Score" column="score" sort={sort} onSort={(column) => setSort((current) => nextLeadSort(current, column))} className="w-14 shrink-0" align="right" />
      </li>
      {ordered.map(({ company, score }) => {
        const open = openId === company.id;
        const sendable =
          company.source === "hunter"
            ? company.status !== "stopped" && hasAccess(company)
            : isSendable(company, score);
        const place = company.place?.trim() || company.city;
        return (
          <li key={company.id}>
            <button
              type="button"
              className="flex w-full items-center gap-4 py-3 text-left"
              aria-expanded={open}
              onClick={() => onToggle(open ? "" : company.id)}
            >
              <span
                className={`size-2.5 shrink-0 rounded-full ${sendable ? "bg-ember" : "bg-line"}`}
                aria-label={sendable ? "Ready" : "Not ready"}
              />
              <span className="min-w-0 flex-1 font-semibold">
                {company.org}
                <span className="ml-2 text-xs font-normal tracking-widest text-sandstone uppercase">
                  {originLabel(cardSource(company))}
                </span>
              </span>
              <span className="hidden w-28 shrink-0 text-sm text-shale sm:block">{place}</span>
              <span className="hidden w-24 shrink-0 text-sm text-shale sm:block">
                {company.sizeBand === "unknown" ? "not stated" : company.sizeBand}
              </span>
              <span className="w-14 shrink-0 text-right text-sm tabular-nums">{score.total}</span>
            </button>
            {open ? (
              <CompanyPanel
                company={company}
                coco={cocoById[company.id] ?? emptyCoco({ canApproveDraft: company.review !== "skipped" })}
                score={score}
                today={today}
                threads={threads.filter((thread) => thread.companyId === company.id)}
                onCoco={onCoco}
                onMutate={onMutate}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function CompanyPanel({
  company,
  coco,
  score,
  today,
  threads,
  onCoco,
  onMutate,
}: {
  company: Company;
  coco: CocoJoin;
  score: ReturnType<typeof scoreCompany>;
  today: string;
  threads: Array<{ id: string; dir: string; subject: string; at: string }>;
  onCoco: (id: string, card: CocoJoin) => void;
  onMutate: (id: string, act: () => string | null) => Promise<string | null>;
}) {
  const [subject, setSubject] = useState(coco.subject);
  const [body, setBody] = useState(coco.body);
  const [buyerName, setBuyerName] = useState(company.buyerName);
  const [buyerTitle, setBuyerTitle] = useState(company.buyerTitle);
  const [email, setEmail] = useState(company.email);
  const [emailSource, setEmailSource] = useState(company.emailSource);
  const [sourceUrl, setSourceUrl] = useState(company.sourceUrl);
  const [draftLate, setDraftLate] = useState(false);
  const onCocoRef = useRef(onCoco);
  onCocoRef.current = onCoco;
  const awaitingDraft = cocoAwaitingDraft(coco);

  useEffect(() => {
    setSubject(coco.subject);
    setBody(coco.body);
  }, [coco.subject, coco.body, coco.stage]);

  useEffect(() => {
    setBuyerName(company.buyerName);
    setBuyerTitle(company.buyerTitle);
    setEmail(company.email);
    setEmailSource(company.emailSource);
    setSourceUrl(company.sourceUrl);
  }, [company]);

  useEffect(() => {
    if (!awaitingDraft) {
      setDraftLate(false);
      return;
    }
    const started = Date.now();
    let cancelled = false;
    let inFlight = false;
    const timer = setInterval(() => {
      if (draftPollDecision({ awaiting: true, elapsedMs: Date.now() - started }) === "stop-timeout") {
        clearInterval(timer);
        setDraftLate(true);
        return;
      }
      if (inFlight) return;
      inFlight = true;
      void getCocoCard({ data: { cardId: company.id } })
        .then((next) => {
          if (!cancelled && next) onCocoRef.current(company.id, next);
        })
        .catch(() => {
          // A missed poll leaves the panel up. The next interval tries again.
        })
        .finally(() => {
          inFlight = false;
        });
    }, COCO_DRAFT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [awaitingDraft, company.id]);

  async function refreshCoco() {
    const next = await getCocoCard({ data: { cardId: company.id } });
    if (next) onCoco(company.id, next);
  }

  async function markApproved() {
    await onMutate(company.id, () => {
      useDesk.setState({
        companies: useDesk.getState().companies.map((row) =>
          row.id === company.id ? { ...row, review: "approved", reviewedOn: today } : row,
        ),
      });
      return null;
    });
  }

  const since = company.lastTouch ? daysBetween(today, company.lastTouch) : null;

  return (
    <div className="mb-4 grid gap-6 border border-line bg-paper p-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-xs tracking-widest text-sandstone uppercase">Company</p>
          <p className="mt-2 text-sm text-coal">
            {company.org} · {company.place?.trim() || company.city} · {company.industry} ·{" "}
            {company.sizeBand === "unknown" ? "size not stated" : company.sizeBand}
          </p>
          <p className="mt-1 text-sm text-shale">{company.domain}</p>
          {company.sourceUrl ? (
            <a className="mt-2 inline-block text-sm font-semibold text-ember hover:underline" href={company.sourceUrl}>
              Company source
            </a>
          ) : (
            <p className="mt-2 text-sm text-shale">No company source URL.</p>
          )}
          <p className="mt-3 text-xs tracking-widest text-sandstone uppercase">Status</p>
          <p className="mt-1 text-sm text-coal">
            {company.status} · {bandLabel(score.band)}
            {hasAccess(company) ? "" : " · access incomplete"}
          </p>
          <p className="mt-3 text-xs tracking-widest text-sandstone uppercase">Review</p>
          <p className="mt-1 text-sm text-coal">
            {company.review ?? "unreviewed"}
            {company.skipReason ? ` · ${company.skipReason}` : ""}
            {company.pipeline ? ` · ${company.pipeline}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs tracking-widest text-sandstone uppercase">Named contact</p>
          {company.buyerName ? (
            <p className="mt-2 text-sm text-coal">
              {company.buyerName}
              {company.buyerTitle ? `, ${company.buyerTitle}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-shale">No named contact yet.</p>
          )}
          {company.email ? <p className="mt-1 text-sm text-coal">{company.email}</p> : null}
          {company.contactSource === "Apollo" ? (
            <p className="mt-2 text-sm text-coal">
              CASL basis: Apollo. {company.casl?.statement || "Under Apollo's terms its data comes from public sources."}
              {company.casl?.pulledOn || company.contactRetrievedOn
                ? ` Pulled ${company.casl?.pulledOn || company.contactRetrievedOn}.`
                : ""}
            </p>
          ) : company.emailSource ? (
            <a className="mt-2 inline-block text-sm font-semibold text-ember hover:underline" href={company.emailSource}>
              Page where this contact was published
            </a>
          ) : (
            <p className="mt-2 text-sm text-shale">No published page for this contact.</p>
          )}
          {company.contactSource === "Public page" ? <p className="mt-2 text-sm text-coal">Source: Public page</p> : null}
          {company.contactSource === "Apollo" && company.apolloEmailStatus ? (
            <p className="mt-1 text-sm text-shale">Email status: {company.apolloEmailStatus}</p>
          ) : null}
          {company.contactRetrievedOn ? (
            <p className="mt-1 text-sm text-shale">Retrieved {company.contactRetrievedOn}</p>
          ) : null}
          {company.apolloUpdatedOn ? (
            <p className="mt-1 text-sm text-shale">Apollo last updated {company.apolloUpdatedOn}</p>
          ) : null}
          {company.cardFlags && company.cardFlags.length > 0 ? (
            <p className="mt-2 text-sm text-coal">Flags: {company.cardFlags.join(", ")}</p>
          ) : null}
        </div>
      </div>

      <div>
        <p className="text-xs tracking-widest text-sandstone uppercase">Why they fit</p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-coal">{company.why}</p>
        {company.whySources && company.whySources.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {company.whySources.map((source) => (
              <li key={source.url}>
                <a className="text-sm font-semibold text-ember hover:underline" href={source.url}>
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <p className="text-xs tracking-widest text-sandstone uppercase">Score</p>
        <p className="mt-2 text-sm text-coal">
          Fit {score.fit} / 60. City {score.geo}, size {score.size}, industry {score.industry}.
        </p>
        <p className="mt-1 text-sm text-coal">
          Access {score.access} / 25. Named person {score.named}, published email {score.publishedEmail}, source {score.source}.
        </p>
        <p className="mt-1 text-sm text-coal">Timing {score.timing} / 15.</p>
        {company.signals && company.signals.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {company.signals.map((signal) => (
              <li key={signal.id} className="text-sm text-shale">
                {signal.kind} · {signal.date} · {signalContribution(signal, today)} points
                {signal.note ? ` · ${signal.note}` : ""}{" "}
                <a className="font-semibold text-ember hover:underline" href={signal.sourceUrl}>
                  Source
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-shale">
            No dated signals on this card yet.
            {company.timingNote ? ` ${company.timingNote}` : ""}
          </p>
        )}
        <p className="mt-2 text-sm text-shale">
          {since == null
            ? "No last touch."
            : `Last touch ${company.lastTouch}. ${since} day${since === 1 ? "" : "s"} ago.`}
        </p>
      </div>

      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void onMutate(company.id, () =>
            useDesk.getState().setCompanyAccess(company.id, { buyerName, buyerTitle, email, emailSource, sourceUrl }),
          );
        }}
      >
        <div>
          <Label htmlFor={`${company.id}-name`}>Name</Label>
          <Input id={`${company.id}-name`} value={buyerName} onChange={(event) => setBuyerName(event.target.value)} />
        </div>
        <div>
          <Label htmlFor={`${company.id}-title`}>Title</Label>
          <Input id={`${company.id}-title`} value={buyerTitle} onChange={(event) => setBuyerTitle(event.target.value)} />
        </div>
        <div>
          <Label htmlFor={`${company.id}-email`}>Published email</Label>
          <Input id={`${company.id}-email`} value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <Label htmlFor={`${company.id}-email-source`}>Page where the email was published</Label>
          <Input id={`${company.id}-email-source`} value={emailSource} onChange={(event) => setEmailSource(event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`${company.id}-source`}>Company source URL</Label>
          <Input id={`${company.id}-source`} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
        </div>
        <div>
          <Button type="submit" variant="outline">
            Save contact
          </Button>
        </div>
      </form>

      <LeadCardActions
        cardId={company.id}
        coco={coco}
        subject={subject}
        body={body}
        onSubject={setSubject}
        onBody={setBody}
        onApproveDraft={() => {
          void approveAndQueueForCoco({ data: { cardId: company.id } }).then(async (result) => {
            if (!result.ok && result.error === "blocked") {
              toast.error(result.reasons?.join(" ") || "This card cannot be queued.");
              return;
            }
            if (!result.ok && result.error === "queue") {
              await markApproved();
              toast.error("Could not queue, try again.");
              return;
            }
            if (!result.ok) {
              toast.error("Could not queue, try again.");
              return;
            }
            await markApproved();
            await refreshCoco();
          });
        }}
        onSkip={(reason) => {
          void (async () => {
            await onMutate(company.id, () => {
              useDesk.setState({
                companies: useDesk.getState().companies.map((row) =>
                  row.id === company.id ? { ...row, review: "skipped", skipReason: reason, reviewedOn: today } : row,
                ),
              });
              return null;
            });
            try {
              await addDoNotContact({
                data: { domain: company.domain, email: company.email, reason: "skipped", today },
              });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save do-not-contact");
            }
          })();
        }}
        onApproveWording={() => {
          void approveWording({ data: { cardId: company.id, subject, body } }).then(async (result) => {
            if (!result.ok && result.error === "unsubscribe") {
              toast.error("Approve wording needs the unsubscribe link in the email.");
              return;
            }
            if (!result.ok && result.error === "send-approved") {
              toast.error("Wording is already approved. Withdraw it before approving again.");
              return;
            }
            if (!result.ok) {
              toast.error("Could not approve the wording.");
              return;
            }
            await refreshCoco();
          });
        }}
        onSaveCopy={() => {
          if (!coco.touch) return;
          void saveCocoDraftEdit({ data: { cardId: company.id, touch: coco.touch, subject, body } }).then(async (result) => {
            if (!result.ok) {
              toast.error("Could not save the copy.");
              return;
            }
            for (const warning of result.warnings ?? []) toast(warning);
            await refreshCoco();
          });
        }}
        onStage={(mark) => {
          void (async () => {
            await onMutate(company.id, () => {
              useDesk.setState({
                companies: useDesk.getState().companies.map((row) =>
                  row.id === company.id ? { ...row, pipeline: mark, pipelineOn: today } : row,
                ),
              });
              return null;
            });
            if (mark !== "lost") return;
            try {
              await addDoNotContact({
                data: { domain: company.domain, email: company.email, reason: "lost", today },
              });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save do-not-contact");
            }
          })();
        }}
        onStop={(scope) => {
          void addDoNotContact({
            data: {
              domain: company.domain,
              email: scope === "person" ? company.email : "",
              reason: scope === "person" ? "dont-contact" : "unsubscribe",
              today,
            },
          }).then(
            () => toast(scope === "person" ? "This person will not be contacted." : "This company will not be contacted."),
            (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not save do-not-contact"),
          );
        }}
        onUnreview={() => {
          void onMutate(company.id, () => {
            useDesk.setState({
              companies: useDesk.getState().companies.map((row) =>
                row.id === company.id ? { ...row, review: "unreviewed", skipReason: undefined, reviewedOn: "" } : row,
              ),
            });
            return null;
          });
        }}
        onWithdraw={() => {
          void withdrawWording({ data: { cardId: company.id } }).then(async (result) => {
            if (!result.ok) {
              toast.error("Could not withdraw the wording approval.");
              return;
            }
            await refreshCoco();
          });
        }}
        onRefresh={() => {
          void refreshCoco();
        }}
        draftWait={awaitingDraft ? (draftLate ? "late" : "writing") : undefined}
        onHandFile={() => {
          void onMutate(company.id, () => {
            const result = useDesk.getState().fileCompany(company.id);
            return result === "missing" ? "missing" : null;
          });
        }}
      />

      {threads.length > 0 ? (
        <div>
          <p className="text-xs tracking-widest text-sandstone uppercase">Thread</p>
          <ul className="mt-2 space-y-2">
            {threads.map((thread) => (
              <li key={thread.id} className="text-sm text-shale">
                {thread.dir} · {thread.subject}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
