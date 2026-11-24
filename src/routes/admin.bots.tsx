import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/desk/Chip";
import { Section } from "@/components/desk/Section";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOTS, type BotId } from "@/data/bots";
import { leadSourceLabel } from "@/data/desk";
import { HUNTER_ROSTER } from "@/data/hunter-profile";
import { partnerFirst, useDesk } from "@/lib/desk-store";
import { botForLead } from "@/lib/bot-copy";
import { formatFunnelDrops } from "@/lib/hunter-drops";
import { getHunterDesk, setHunterPaused } from "@/lib/leads-hunter-api";

export const Route = createFileRoute("/admin/bots")({
  loader: () => getHunterDesk(),
  component: BotsPage,
  validateSearch: (s: Record<string, unknown>): { lead?: string } => {
    const lead = typeof s.lead === "string" && s.lead ? s.lead : undefined;
    return lead ? { lead } : {};
  },
  head: () => ({ meta: [{ title: "Bots — Unearth Self Desk" }] }),
});

const SEND_ERR: Record<string, string> = {
  missing: "That file is not on the book.",
  closed: "Closed. Do not send.",
  paused: "That bot is paused.",
  cap: "Three nudges already. Sequence stopped.",
  unnamed: "Research card. Name a person before you send.",
  access: "Send blocked. Named person, published email, and source URL.",
};

function runLabel(run: "always-on" | "nightly") {
  return run === "nightly" ? "Nightly" : "Always on";
}

function outcomeLabel(outcome: string) {
  if (outcome === "fired") return "Fired";
  if (outcome === "skipped-paused") return "Skipped, paused";
  if (outcome === "skipped-killed") return "Skipped, kill switch";
  if (outcome === "skipped-hours") return "Skipped, outside working hours";
  if (outcome === "skipped-not-4am") return "Skipped, not 4am Edmonton";
  if (outcome === "skipped-already-swept") return "Skipped, already swept today";
  if (outcome === "skipped-target-met") return "Skipped, ceiling met";
  if (outcome === "capped-budget") return "Capped, model-call budget";
  if (outcome === "capped-spend") return "Capped, monthly dollar cap";
  if (outcome === "skipped-busy") return "Skipped, already running";
  if (outcome === "stopped-time") return "Stopped for time";
  if (outcome === "stopped-sweep") return "Nightly sweep stopped";
  if (outcome === "error") return "Error";
  return outcome;
}

function formatRun(iso: string) {
  if (!iso) return "No run yet.";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "No run yet.";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function BotsPage() {
  const initialHunter = Route.useLoaderData();
  const [hunter, setHunter] = useState(initialHunter);
  const [savingHunter, setSavingHunter] = useState(false);
  const search = Route.useSearch();
  const leads = useDesk((s) => s.leads);
  const threads = useDesk((s) => s.threads);
  const paused = useDesk((s) => s.paused);
  const toggleBot = useDesk((s) => s.toggleBot);
  const draftMail = useDesk((s) => s.draftMail);
  const logReply = useDesk((s) => s.logReply);
  const stopLead = useDesk((s) => s.stopLead);
  const [leadId, setLeadId] = useState(search.lead || leads[0]?.id || "");
  const [tab, setTab] = useState<"queue" | "roster">("roster");

  const lead = leads.find((l) => l.id === leadId) ?? leads[0];
  const mail = useMemo(
    () => (lead ? threads.filter((m) => m.leadId === lead.id) : []),
    [lead, threads],
  );
  const queued = threads.filter((m) => m.dir === "draft").length;
  const dueFollow = leads.filter(
    (l) => !l.stopped && l.status !== "lost" && l.status !== "won" && l.nudges > 0 && l.nudges < 3,
  ).length;
  async function toggleHunter() {
    if (hunter.storage !== "redis") {
      toast("Redis is not connected. Pause cannot be saved.");
      return;
    }
    setSavingHunter(true);
    try {
      const next = await setHunterPaused({ data: { paused: !hunter.paused } });
      setHunter(next);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update the hunter");
    } finally {
      setSavingHunter(false);
    }
  }

  function run(bot: BotId) {
    if (!lead) return;
    const err = draftMail(lead.id, bot);
    if (err) toast(SEND_ERR[err] ?? err);
    else toast(`Draft from ${bot}`);
  }

  return (
    <div className="grid gap-10">
      <p className="max-w-prose text-pretty text-muted">
        Grok Bots can draft a note here. The email itself goes out only from Coco's chat, from
        chris@badlandsbootcamp.com. Do not invent a price.
      </p>
      <p className="max-w-prose text-pretty text-muted">
        Want a new bot? Raise it with Rex, the Chief of Staff. New bots are added through the
        operating-system docs, with human approval before anything goes live.
      </p>

      <section className="grid gap-6 sm:grid-cols-3">
        <Stat label="Booked calls this month" value={String(hunter.bookedThisMonth)} hint="Hunter cards marked booked or won" />
        <Stat label="Drafts waiting" value={String(queued)} hint="Human still sends" />
        <Stat label="Hunter" value={hunter.killed ? "Killed" : hunter.paused ? "Paused" : "Running"} hint="Working hours, campaign list" />
      </section>

      <div className="flex flex-wrap gap-2">
        <Chip active={tab === "queue"} onClick={() => setTab("queue")}>
          Queue
        </Chip>
        <Chip active={tab === "roster"} onClick={() => setTab("roster")}>
          Roster
        </Chip>
      </div>

      {tab === "roster" ? (
        <ul className="grid gap-3">
          <li className="grid gap-3 border border-line bg-paper p-4 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-3xl font-black uppercase leading-none">{HUNTER_ROSTER.name}</h2>
                <Badge tone={hunter.killed || hunter.paused ? "lost" : "won"}>
                  {hunter.killed ? "kill switch" : hunter.paused ? "paused" : "running"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-pretty">{HUNTER_ROSTER.job}</p>
              <p className="mt-2 text-sm text-pretty">
                Also in Chris&apos;s Grok Bot dashboard as Hunter. Same job, same lead book. It finds and files. It never sends.
              </p>
              <p className="mt-2 text-sm text-pretty">
                Pause stops the campaign hunt. The nightly sweep is already stopped.
              </p>
              <p className="mt-2 text-sm text-muted">
                {HUNTER_ROSTER.trigger} · {partnerFirst(HUNTER_ROSTER.owner)}
              </p>
              <p className="mt-2 text-sm text-sandstone">{HUNTER_ROSTER.escalate}</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                {HUNTER_ROSTER.limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-coal">Last run {formatRun(hunter.lastRunAt)}.</p>
              <p className="mt-1 text-sm text-coal">
                Heartbeat {hunter.heartbeatAt ? formatRun(hunter.heartbeatAt) : "none"}
                {hunter.heartbeatLate ? ". Late." : "."}
              </p>
              {hunter.lastRunResult ? <p className="mt-1 text-sm text-shale">{hunter.lastRunResult}</p> : null}
              <p className="mt-1 text-sm text-coal">
                Cards filed today: {hunter.cardsFiledToday} of {hunter.fileCap}.
              </p>
              <p className="mt-1 text-sm text-muted">
                Contact-ready today: {hunter.filedToday} of {hunter.cardTarget} target.
              </p>
              <p className="mt-1 text-sm text-muted">
                Model calls today: {hunter.callsToday}. No daily cap. Model {hunter.model}.
              </p>
              <p className="mt-1 text-sm text-muted">
                Apollo reveals today: {hunter.apolloRevealsToday} of {hunter.apolloCreditCap}. People search is not counted.
              </p>
              <p className="mt-1 text-sm text-muted">
                Apollo credits today: {hunter.apolloCreditsToday}. This month: {hunter.apolloCreditsMonth}. Company search, sizing, and reveals. No credit cap.
              </p>
              {hunter.apolloCreditAlarm ? <p className="mt-1 text-sm text-coal">{hunter.apolloCreditAlarm}</p> : null}
              <p className="mt-1 text-sm text-coal">
                Active segment: {hunter.campaign.segment}. Source: {hunter.campaign.segmentSource}. Split {hunter.campaign.split}. {hunter.campaign.splitReason}
              </p>
              <p className="mt-1 text-sm text-muted">
                Canada list {hunter.campaign.canadaSize ?? "not sized"}. United States list {hunter.campaign.usSize ?? "not sized"}.
              </p>
              <p className="mt-1 text-sm text-muted">{hunter.campaign.weightNote}</p>
              <p className="mt-1 text-sm text-pretty text-shale">{hunter.campaign.planNote}</p>
              {hunter.campaign.suggestionId !== hunter.campaign.segmentId ? (
                <p className="mt-1 text-sm text-coal">
                  Monday suggestion, not applied: {hunter.campaign.suggestion}. {hunter.campaign.suggestionReason}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-muted">Monthly spend: {hunter.monthlyCap}.</p>
              <p className="mt-1 text-sm text-shale">{hunter.bookingLink.note}</p>
              {hunter.alarms.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-coal" role="status">
                  {hunter.alarms.map((alarm) => (
                    <li key={alarm}>{alarm}</li>
                  ))}
                </ul>
              ) : null}
              {hunter.funnel ? (
                <p className="mt-2 text-sm text-muted">
                  Latest funnel: searched {hunter.funnel.searched}, candidates {hunter.funnel.candidates}, verified{" "}
                  {hunter.funnel.verified}, contact found {hunter.funnel.contactFound}, filed {hunter.funnel.filed}.{" "}
                  {formatFunnelDrops(hunter.funnel)}
                </p>
              ) : null}
              <div className="mt-4">
                <p className="text-xs tracking-widest text-sandstone uppercase">Methods</p>
                <ul className="mt-2 grid gap-1 text-sm text-muted">
                  {hunter.methodRegistry.map((method) => (
                    <li key={method.id}>
                      {method.label}: {method.enabled ? "on" : "off"}
                      {method.trial ? ", trial" : ""}. Share {Math.round(method.share * 100)}%.
                    </li>
                  ))}
                </ul>
                <table className="mt-3 w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs tracking-widest text-sandstone uppercase">
                      <th className="py-1 pr-3">Method</th>
                      <th className="py-1 pr-3">Filed</th>
                      <th className="py-1 pr-3">Approval</th>
                      <th className="py-1 pr-3">Reply</th>
                      <th className="py-1 pr-3">Booked</th>
                      <th className="py-1">Cost per card</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hunter.methods.map((row) => (
                      <tr key={row.method} className="border-t border-line">
                        <td className="py-2 pr-3">{row.method}</td>
                        <td className="py-2 pr-3">{row.filed}</td>
                        <td className="py-2 pr-3">{row.enough && row.approvalRate != null ? `${Math.round(row.approvalRate * 100)}%` : "not enough data"}</td>
                        <td className="py-2 pr-3">{row.enough && row.replyRate != null ? `${Math.round(row.replyRate * 100)}%` : "not enough data"}</td>
                        <td className="py-2 pr-3">{row.enough ? row.booked : "not enough data"}</td>
                        <td className="py-2">{row.enough && row.costPerCard != null ? row.costPerCard.toFixed(2) : "not enough data"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <p className="text-xs tracking-widest text-sandstone uppercase">Run log</p>
                <p className="mt-1 text-sm text-muted">Last 20 runs. Read only.</p>
                {hunter.recentRuns.length === 0 ? (
                  <p className="mt-2 text-sm text-shale">No runs logged yet.</p>
                ) : (
                  <ol className="mt-2 grid gap-2">
                    {hunter.recentRuns.map((run) => (
                      <li key={`${run.at}-${run.run}`} className="border border-line p-3 text-sm">
                        <p className="text-coal">
                          {formatRun(run.at)} · {runLabel(run.run)} · {outcomeLabel(run.outcome)}
                        </p>
                        <p className="mt-1 text-muted">
                          Model calls {run.modelCalls}. Candidates {run.candidates}. Cards filed {run.cardsFiled}.
                          Contact-ready {run.contactReady}. Apollo searches {run.apolloSearches}. Apollo reveals{" "}
                          {run.apolloReveals}.
                        </p>
                        {run.alarms.length > 0 ? <p className="mt-1 text-coal">Alarms: {run.alarms.join(" ")}</p> : null}
                        {run.funnel ? (
                          <p className="mt-1 text-muted">
                            Funnel: searched {run.funnel.searched}, candidates {run.funnel.candidates}, verified {run.funnel.verified},
                            contact found {run.funnel.contactFound}, filed {run.funnel.filed}. {formatFunnelDrops(run.funnel)}
                          </p>
                        ) : null}
                        {run.error ? <p className="mt-1 text-shale">{run.error}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {hunter.storage === "browser" ? (
                <p className="mt-2 text-sm text-shale">Redis is not connected. Pause cannot be saved.</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={savingHunter || hunter.storage !== "redis"}
                onClick={() => void toggleHunter()}
              >
                {hunter.paused ? "Resume" : "Pause"}
              </Button>
            </div>
          </li>
          {BOTS.map((b) => (
            <li key={b.id} className="grid gap-3 border border-line bg-paper p-4 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-3xl font-black uppercase leading-none">{b.name}</h2>
                  <Badge tone={paused[b.id] ? "lost" : "won"}>{paused[b.id] ? "paused" : "armed"}</Badge>
                </div>
                <p className="mt-2 text-sm text-pretty">{b.job}</p>
                <p className="mt-2 text-sm text-muted">
                  {b.trigger} · {partnerFirst(b.owner)}
                </p>
                <p className="mt-2 text-sm text-sandstone">{b.escalate}</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                  {b.limits.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
              <Button type="button" variant="outline" onClick={() => toggleBot(b.id)}>
                {paused[b.id] ? "Arm" : "Pause"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "queue" && !lead ? <p className="text-muted">No open files.</p> : null}

      {tab === "queue" && lead ? (
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          <Section kicker="Open files">
            <ul className="divide-y divide-line border-y border-line">
              {leads
                .filter((l) => l.status !== "lost")
                .map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setLeadId(l.id)}
                      className={
                        l.id === lead.id
                          ? "flex w-full flex-col items-start gap-1 py-3 text-left"
                          : "flex w-full flex-col items-start gap-1 py-3 text-left text-muted"
                      }
                    >
                      <span className="font-semibold">{l.org}</span>
                      <span className="text-xs tabular-nums">
                        {l.id} · {l.nudges}/3 · {leadSourceLabel(l.source)}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </Section>

          <div className="grid gap-6">
            <div className="border border-line border-l-2 border-l-coal bg-paper p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={lead.kind}>{lead.kind}</Badge>
                <span className="text-xs tabular-nums text-muted">{lead.id}</span>
                {lead.stopped ? <Badge tone="lost">stopped</Badge> : null}
              </div>
              <h2 className="mt-2 font-display text-4xl font-black uppercase leading-none">{lead.org}</h2>
              <p className="mt-2 text-sm text-muted">
                {lead.contact}
                {lead.email ? ` · ${lead.email}` : " · no address"}
              </p>
              <p className="mt-2 text-sm">
                <span className="text-sandstone">Next · </span>
                {lead.next}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => run(botForLead(lead.kind))}>
                  Draft
                </Button>
                <Button type="button" variant="outline" onClick={() => run("followup")}>
                  Follow-up draft
                </Button>
                <Button type="button" variant="outline" onClick={() => stopLead(lead.id)}>
                  Stop
                </Button>
                <Link
                  to="/admin/pipeline"
                  className="inline-flex min-h-11 items-center justify-center rounded-xs border border-line-strong px-4 text-sm font-semibold text-coal hover:border-coal"
                >
                  Pipeline
                </Link>
              </div>
              <ReplyForm
                onSubmit={(body) => {
                  logReply(lead.id, body);
                  toast("Reply on the book. Sequence stopped.");
                }}
              />
            </div>

            <Section kicker="Thread">
              {mail.length === 0 ? (
                <p className="text-sm text-muted">No mail yet.</p>
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
        </div>
      ) : null}
    </div>
  );
}

function ReplyForm({ onSubmit }: { onSubmit: (body: string) => void }) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = String(data.get("body") || "");
    onSubmit(body);
    e.currentTarget.reset();
  }
  return (
    <form onSubmit={submit} className="mt-5 grid gap-2">
      <label className="text-xs tracking-widest text-sandstone uppercase" htmlFor="reply">
        Log a reply
      </label>
      <textarea
        id="reply"
        name="body"
        required
        rows={3}
        placeholder="Paste what they sent. Sequence stops."
        className="min-h-20 w-full resize-y rounded-sm border border-line bg-paper px-3 py-2 text-sm text-coal outline-none focus:border-coal"
      />
      <div>
        <Button type="submit" variant="outline">
          Log inbound
        </Button>
      </div>
    </form>
  );
}
