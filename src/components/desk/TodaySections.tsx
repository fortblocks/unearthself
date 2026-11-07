import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Section } from "@/components/desk/Section";
import { SampleBadge } from "@/components/desk/SampleBadge";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { cad, clock } from "@/lib/format";
import { formatMeetingDate } from "@/lib/date-format";
import { formatDateOrdinal } from "@/lib/minutes-archive";
import { fetchArrivals, SAMPLE_BOOK_DATE, type ArrivalRow } from "@/lib/today/sources/arrivals";
import { fetchDiary, type DiaryRow } from "@/lib/today/sources/diary";
import { fetchLeads, type DeskLead } from "@/lib/today/sources/leads";
import { fetchMeetingList } from "@/lib/today/sources/minutes";
import { fetchNeedsHuman, type NeedsHumanRow } from "@/lib/today/sources/needs-human";
import { fetchProgramme, type Programme } from "@/lib/today/sources/programme";
import { fetchShifts, type ShiftRow } from "@/lib/today/sources/shifts";
import { fetchStats, type TodayStats } from "@/lib/today/sources/stats";
import type { SectionResult } from "@/lib/today/types";
import type { Meeting } from "@/lib/minutes";

type View<T> = {
  status: "loading" | "ready";
  result: SectionResult<T> | null;
  error: string | null;
};

function useSection<T>(load: () => Promise<SectionResult<T>>): View<T> {
  const [view, setView] = useState<View<T>>({ status: "loading", result: null, error: null });
  useEffect(() => {
    let cancelled = false;
    load().then(
      (result) => {
        if (!cancelled) setView({ status: "ready", result, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          setView({
            status: "ready",
            result: null,
            error: error instanceof Error ? error.message : "This section failed.",
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load]);
  return view;
}

function Frame<T>({
  kicker,
  view,
  action,
  children,
}: {
  kicker: string;
  view: View<T>;
  action?: ReactNode;
  children: (data: T, mode: "sample" | "live") => ReactNode;
}) {
  const mode = view.result?.mode;
  return (
    <Section
      kicker={kicker}
      action={
        <span className="flex items-center gap-3">
          {mode === "sample" ? <SampleBadge /> : null}
          {action}
        </span>
      }
    >
      {view.status === "loading" ? <p className="text-sm text-muted">Loading…</p> : null}
      {view.error ? <p className="border-l-2 border-ember bg-ember/5 px-4 py-3 text-sm text-coal">{view.error}</p> : null}
      {view.result && !view.result.ok ? (
        <p className="border-l-2 border-ember bg-ember/5 px-4 py-3 text-sm text-coal">{view.result.error}</p>
      ) : null}
      {view.result?.ok ? children(view.result.data, view.result.mode) : null}
    </Section>
  );
}

function sampleBookNote(mode: "sample" | "live") {
  if (mode !== "sample") return null;
  return (
    <p className="mb-3 text-xs text-muted">
      Sample book dated {formatDateOrdinal(SAMPLE_BOOK_DATE)}. Not the live date in the header.
    </p>
  );
}

export function StatsSection() {
  const view = useSection(fetchStats);
  return (
    <Frame kicker="Today" view={view}>
      {(stats: TodayStats) => (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="In house" value={stats.inHouse} hint={stats.inHouseHint} />
          <Stat label="Treatments" value={stats.treatments} hint={stats.treatmentsHint} />
          <Stat label="Open pipeline" value={stats.pipeline} hint={stats.pipelineHint} />
          <Stat label="Open risk" value={stats.risk} hint={stats.riskHint} />
        </section>
      )}
    </Frame>
  );
}

export function ArrivalsSection() {
  const view = useSection(fetchArrivals);
  return (
    <Frame kicker="Arrivals and keys" view={view}>
      {(rows: ArrivalRow[], mode) => (
        <>
          {sampleBookNote(mode)}
          <ul className="divide-y divide-line border-y border-line">
            {rows.map((row) => (
              <li key={row.suite} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">{row.suite}</p>
                  <p className="text-sm text-pretty text-muted">{row.line}</p>
                </div>
                {row.state === "in" ? <Badge tone="won">In</Badge> : null}
                {row.state === "out" ? <Badge tone="hold">Out</Badge> : null}
                {row.state === "open" ? <Badge tone="new">Open</Badge> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </Frame>
  );
}

export function DiarySection() {
  const view = useSection(fetchDiary);
  return (
    <Frame kicker="Basecamp diary" view={view}>
      {(rows: DiaryRow[], mode) => (
        <>
          {sampleBookNote(mode)}
          <ul className="divide-y divide-line border-y border-line">
            {rows.map((slot) => (
              <li key={slot.id} className="grid gap-1 py-3 sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:gap-4">
                <p className="text-sm text-shale tabular-nums">{clock(slot.time)}</p>
                <div>
                  <p className="font-semibold">{slot.name}</p>
                  <p className="text-sm text-muted">
                    {slot.guest} · {slot.room} · {slot.practitioner}
                  </p>
                </div>
                <p className="text-sm text-sandstone tabular-nums">{cad(slot.price)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Frame>
  );
}

export function ShiftsSection() {
  const view = useSection(fetchShifts);
  return (
    <Frame kicker="On shift" view={view}>
      {(rows: ShiftRow[], mode) => (
        <>
          {sampleBookNote(mode)}
          <ul className="divide-y divide-line border-y border-line">
            {rows.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">{shift.name}</p>
                  <p className="text-sm text-muted">{shift.role}</p>
                </div>
                <p className="text-sm text-shale tabular-nums">{shift.hours}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Frame>
  );
}

export function ProgrammeSection() {
  const view = useSection(fetchProgramme);
  return (
    <Frame kicker="Next programme" view={view}>
      {(programme: Programme, mode) => (
        <div className="border border-line bg-paper p-5">
          {sampleBookNote(mode)}
          <p className="font-semibold">{programme.title}</p>
          <p className="mt-1 text-sm text-muted">{programme.note}</p>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            {programme.days.map((day) => (
              <div key={day.date}>
                <p className="text-xs tracking-widest text-sandstone uppercase">{day.label}</p>
                <ul className="mt-2 space-y-2">
                  {day.blocks.map((block) => (
                    <li key={block.time + block.item}>
                      <p className="text-sm">
                        <span className="text-shale tabular-nums">{clock(block.time)}</span>
                        <span className="text-muted"> · </span>
                        {block.item}
                      </p>
                      <p className="text-xs text-muted">{block.owner}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </Frame>
  );
}

function leadTone(status: string): "new" | "hold" | "proposal" | "won" | "lost" {
  if (status === "hold" || status === "proposal" || status === "won" || status === "lost") return status;
  return "new";
}

function LeadList({ title, rows }: { title: string; rows: DeskLead[] }) {
  return (
    <div>
      <p className="mb-2 text-xs tracking-widest text-sandstone uppercase">{title}</p>
      {rows.length === 0 ? <p className="text-sm text-muted">None in this sample.</p> : null}
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((lead) => (
          <li key={lead.id} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="font-semibold">{lead.org}</p>
              <p className="text-sm text-pretty text-muted">
                {lead.next} · {lead.dates}
              </p>
              <p className="mt-1 text-xs text-sandstone">{lead.owner}</p>
            </div>
            <Badge tone={leadTone(lead.status)}>{lead.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LeadsSection() {
  const view = useSection(fetchLeads);
  return (
    <Frame
      kicker="Business development leads"
      view={view}
      action={
        <Link to="/admin/pipeline" className="text-sm font-semibold text-ember">
          Pipeline
        </Link>
      }
    >
      {(rows: DeskLead[], mode) => (
        <>
          {sampleBookNote(mode)}
          <div className="grid gap-8 md:grid-cols-2">
            <LeadList title="Inbound" rows={rows.filter((lead) => lead.direction === "inbound")} />
            <LeadList title="Outbound" rows={rows.filter((lead) => lead.direction === "outbound")} />
          </div>
        </>
      )}
    </Frame>
  );
}

export function NeedsHumanSection() {
  const view = useSection(fetchNeedsHuman);
  return (
    <Frame
      kicker="Needs a human"
      view={view}
      action={
        <Link to="/admin/risk" className="text-sm font-semibold text-ember">
          Risk board
        </Link>
      }
    >
      {(rows: NeedsHumanRow[], mode) =>
        rows.length === 0 ? (
          <p className="text-sm text-muted">Nothing open.</p>
        ) : (
          <>
            {sampleBookNote(mode)}
            <ul className="grid gap-3 md:grid-cols-2">
              {rows.map((row) => (
                <li key={row.id} className="border border-line bg-paper p-4">
                  <Badge tone={row.level}>{row.kind}</Badge>
                  <p className="mt-2 font-semibold">{row.title}</p>
                  <p className="mt-1 text-sm text-pretty text-muted">{row.detail}</p>
                  <p className="mt-2 text-xs text-sandstone">{row.owner}</p>
                </li>
              ))}
            </ul>
          </>
        )
      }
    </Frame>
  );
}

export function RecentMinutesSection() {
  const view = useSection(fetchMeetingList);
  return (
    <Frame
      kicker="Recent minutes"
      view={view}
      action={
        <Link to="/admin/minutes" className="text-sm font-semibold text-ember">
          All minutes
        </Link>
      }
    >
      {(meetings: Meeting[]) =>
        meetings.length === 0 ? (
          <p className="border border-line bg-paper px-4 py-6 text-sm text-muted">
            No meetings were returned. The folder may be empty, or Drive could not be read. This is not a confirmation
            that there are no minutes.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {meetings.slice(0, 5).map((meeting) => (
              <li key={meeting.id} className="flex items-center justify-between gap-4 py-3">
                <p className="font-semibold">{formatMeetingDate(meeting.date)}</p>
                <Link
                  to="/admin/minutes/$meetingId"
                  params={{ meetingId: meeting.id }}
                  className="text-sm font-semibold text-ember"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )
      }
    </Frame>
  );
}
