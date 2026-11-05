import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Section } from "@/components/desk/Section";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APEX_ROS, SUITES, TODAY } from "@/data/desk";
import { buildBrief } from "@/lib/brief";
import { cad, clock } from "@/lib/format";
import { openPipeline, partnerFirst, useDesk, weightedPipeline } from "@/lib/desk-store";
import { listMeetings, getMeetingMinutes, type MeetingAction } from "@/lib/minutes";
import {
  extractAllActions,
  getActionCompletions,
  markActionComplete,
  isRedisConfigured,
} from "@/lib/action-tracking";
import { formatDateOrdinal } from "@/lib/minutes-archive";

export const Route = createFileRoute("/admin/")({
  component: TodayPage,
  head: () => ({ meta: [{ title: "Today — Unearth Self Desk" }] }),
  loader: async () => {
    const [allActions, completions, redisConfigured] = await Promise.all([
      extractAllActions(),
      getActionCompletions(),
      isRedisConfigured(),
    ]);
    return { allActions, completions, redisConfigured };
  },
});

function occupiedToday(checkIn: string, checkOut: string) {
  return checkIn <= TODAY && checkOut > TODAY;
}

function TodayPage() {
  const lookingAs = useDesk((s) => s.lookingAs);
  const stays = useDesk((s) => s.stays);
  const slots = useDesk((s) => s.slots);
  const shifts = useDesk((s) => s.shifts);
  const leads = useDesk((s) => s.leads);
  const money = useDesk((s) => s.money);
  const riskAll = useDesk((s) => s.risk);
  const risk = riskAll.filter((r) => r.open);
  const inHouse = stays.filter((s) => occupiedToday(s.checkIn, s.checkOut));
  const open = openPipeline(leads);
  const brief = buildBrief({ partner: lookingAs, leads, stays, slots, money, risk: riskAll });
  const mineLeads = open.filter((l) => l.owner === lookingAs);
  const mineRisk = risk.filter((r) => r.owner === lookingAs);
  const norahFirst = lookingAs === "norah";
  
  // Load action tracking data
  const { allActions, completions, redisConfigured } = Route.useLoaderData();
  const [localCompletions, setLocalCompletions] = useState(completions);
  const [markingComplete, setMarkingComplete] = useState<string | null>(null);
  
  // Normalize lookingAs to match PartnerName format (capitalize first letter)
  const normalizedPartner = (lookingAs.charAt(0).toUpperCase() + lookingAs.slice(1)) as "Lisa" | "Tess" | "Norah" | "Christopher";
  
  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Filter for this partner's open actions from last 30 days
  const completedActionIds = new Set(
    localCompletions.filter((c) => !c.undone).map((c) => c.actionId)
  );
  const myOpenActions = allActions.filter(
    (a) => a.owner === normalizedPartner && 
           !completedActionIds.has(a.id) &&
           a.meetingDate >= thirtyDaysAgoStr  // Only last 30 days for Today page
  );
  
  // Handle mark complete
  const handleMarkComplete = async (actionId: string) => {
    if (!redisConfigured) return;
    setMarkingComplete(actionId);
    try {
      const result = await markActionComplete({ data: { actionId, completedBy: normalizedPartner } });
      if (result.ok) {
        // Add to local completions
        setLocalCompletions([...localCompletions, {
          actionId,
          completedBy: normalizedPartner,
          completedAt: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error("Failed to mark action complete:", error);
    } finally {
      setMarkingComplete(null);
    }
  };

  const keys = (
    <Section kicker="Arrivals and keys">
      <ul className="divide-y divide-line border-y border-line">
        {SUITES.map((suite) => {
          const stay = stays.find((s) => s.suite === suite.slug && occupiedToday(s.checkIn, s.checkOut));
          const leaving = stays.find((s) => s.suite === suite.slug && s.checkOut === TODAY);
          const incoming = stays.find((s) => s.suite === suite.slug && s.checkIn === TODAY);
          return (
            <li key={suite.slug} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-semibold">{suite.name}</p>
                <p className="text-sm text-pretty text-muted">
                  {stay
                    ? stay.guest
                    : leaving
                      ? `Out this morning · ${leaving.guest}`
                      : incoming
                        ? `Due in · ${incoming.guest}`
                        : "Empty"}
                </p>
              </div>
              {stay ? (
                <Badge tone="won">In</Badge>
              ) : leaving ? (
                <Badge tone="hold">Out</Badge>
              ) : (
                <Badge tone="new">Open</Badge>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );

  const diary = (
    <Section kicker="Basecamp diary">
      <ul className="divide-y divide-line border-y border-line">
        {slots.map((slot) => (
          <li key={slot.id} className="grid gap-1 py-3 sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:gap-4">
            <p className="tabular-nums text-sm text-shale">{clock(slot.time)}</p>
            <div>
              <p className="font-semibold">{slot.name}</p>
              <p className="text-sm text-muted">
                {slot.guest} · {slot.room} · {slot.practitioner}
              </p>
            </div>
            <p className="text-sm tabular-nums text-sandstone">{cad(slot.price)}</p>
          </li>
        ))}
      </ul>
    </Section>
  );

  return (
    <div className="grid gap-10">
      <section className="border-l-2 border-coal bg-paper px-5 py-4">
        <p className="text-xs tracking-widest text-sandstone uppercase">{brief.kicker}</p>
        <p className="mt-2 max-w-prose text-pretty text-lg leading-snug">{brief.line}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {brief.pulls.map((p) => (
            <Link
              key={p.label}
              to={p.to}
              className="inline-flex min-h-11 items-center border border-line px-3 text-sm font-semibold text-shale hover:border-coal hover:text-coal"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="In house" value={`${inHouse.length} / 4`} hint="Haven keys tonight" />
        <Stat label="Treatments" value={String(slots.length)} hint="Basecamp diary today" />
        <Stat label="Open pipeline" value={String(open.length)} hint={cad(weightedPipeline(leads)) + " weighted"} />
        <Stat label="Open risk" value={String(risk.length)} hint="Waivers, weather, cover" />
      </section>

      {myOpenActions.length > 0 && (
        <Section
          kicker="Your actions"
          action={
            <Link to="/admin/minutes" className="text-sm font-semibold text-ember">
              All actions
            </Link>
          }
        >
          <ul className="divide-y divide-line border-y border-line">
            {myOpenActions.slice(0, 5).map((action) => (
              <li key={action.id} className="flex items-start justify-between gap-4 py-3">
                <div className="flex-1">
                  <p className="font-semibold">{action.text}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatDateOrdinal(action.meetingDate)} · {action.meetingTitle}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={!redisConfigured || markingComplete === action.id}
                  onClick={() => handleMarkComplete(action.id)}
                  className="text-sm px-3 py-1"
                >
                  {markingComplete === action.id ? "..." : "Mark complete"}
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {mineLeads.length + mineRisk.length > 0 ? (
        <Section 
          kicker={`On ${partnerFirst(lookingAs)}`}
          action={
            <Link to="/admin/minutes" className="text-sm font-semibold text-ember">
              All minutes
            </Link>
          }
        >
          <ul className="divide-y divide-line border-y border-line">
            {mineLeads.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">{l.org}</p>
                  <p className="text-sm text-pretty text-muted">{l.next}</p>
                </div>
                <Badge tone={l.status}>{l.status}</Badge>
              </li>
            ))}
            {mineRisk.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-pretty text-muted">{r.detail}</p>
                </div>
                <Badge tone={r.level}>{r.kind}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section kicker="Next programme">
        <div className="border border-line bg-paper p-5">
          <p className="font-semibold">{APEX_ROS.title}</p>
          <p className="mt-1 text-sm text-muted">Draft. Outdoor stays off the card until D13.</p>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            {APEX_ROS.days.map((day) => (
              <div key={day.date}>
                <p className="text-xs tracking-widest text-sandstone uppercase">{day.label}</p>
                <ul className="mt-2 space-y-2">
                  {day.blocks.map((b) => (
                    <li key={b.time + b.item}>
                      <p className="text-sm">
                        <span className="tabular-nums text-shale">{clock(b.time)}</span>
                        <span className="text-muted"> · </span>
                        {b.item}
                      </p>
                      <p className="text-xs text-muted">{b.owner}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <section className="grid gap-8 lg:grid-cols-2">
        {norahFirst ? diary : keys}
        <Section kicker="On shift">
          <ul className="divide-y divide-line border-y border-line">
            {shifts.map((sh) => (
              <li key={sh.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">{sh.name}</p>
                  <p className="text-sm text-muted">{sh.role}</p>
                </div>
                <p className="text-sm tabular-nums text-shale">{sh.hours}</p>
              </li>
            ))}
          </ul>
        </Section>
      </section>

      {norahFirst ? keys : diary}

      {risk.length > 0 ? (
        <Section
          kicker="Needs a human"
          action={
            <Link to="/admin/risk" className="text-sm font-semibold text-ember">
              Risk board
            </Link>
          }
        >
          <ul className="grid gap-3 md:grid-cols-2">
            {risk.map((r) => (
              <li key={r.id} className="border border-line bg-paper p-4">
                <Badge tone={r.level}>{r.kind}</Badge>
                <p className="mt-2 font-semibold">{r.title}</p>
                <p className="mt-1 text-sm text-pretty text-muted">{r.detail}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
