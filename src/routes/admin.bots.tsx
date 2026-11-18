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
  const sendMail = useDesk((s) => s.sendMail);
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

  function run(bot: BotId, send: boolean) {
    if (!lead) return;
    const err = send ? sendMail(lead.id, bot) : draftMail(lead.id, bot);
    if (err) toast(SEND_ERR[err] ?? err);
    else toast(send ? `Queued ${bot} · mailto opened` : `Draft from ${bot}`);
  }

  return (
    <div className="grid gap-10">
      <p className="max-w-prose text-pretty text-muted">
        Grok Bots do first touch and follow-up. Humans close. Gmail is not connected yet, so send
        writes the thread and opens a mail draft. Three unanswered nudges, then stop. Do not invent
        a price.
      </p>
      <p className="max-w-prose text-pretty text-muted">
        Want a new bot? Raise it with Rex, the Chief of Staff. New bots are added through the
        operating-system docs, with human approval before anything goes live.
      </p>

      <section className="grid gap-6 sm:grid-cols-3">
        <Stat label="Drafts waiting" value={String(queued)} hint="Human still sends" />
        <Stat label="Follow-up live" value={String(dueFollow)} hint="Nudge 1 or 2" />
        <Stat label="Hunter" value={hunter.paused ? "Paused" : "Running"} hint="Nightly and always on" />
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
                <Badge tone={hunter.paused ? "lost" : "won"}>{hunter.paused ? "paused" : "running"}</Badge>
              </div>
              <p className="mt-2 text-sm text-pretty">{HUNTER_ROSTER.job}</p>
              <p className="mt-2 text-sm text-pretty">
                Also in Chris&apos;s Grok Bot dashboard as Hunter. Same job, same lead book. It finds and files. It never sends.
              </p>
              <p className="mt-2 text-sm text-pretty">
                Pause stops the nightly local sweep and the always-on hunt.
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
              {hunter.lastRunResult ? <p className="mt-1 text-sm text-shale">{hunter.lastRunResult}</p> : null}
              <p className="mt-1 text-sm text-coal">
                Cards filed today: {hunter.filedToday} of {hunter.cardTarget}.
              </p>
              <p className="mt-1 text-sm text-muted">
                Model calls today: {hunter.callsToday} of {hunter.callBudget}.
              </p>
              {hunter.capacityActive && hunter.capacity ? (
                <p className="mt-2 border border-ember bg-paper p-3 text-sm text-coal" role="status">
                  Capacity problem. The model-call budget ran out before 48 contact-ready cards were filed.
                  Filed {hunter.capacity.cardsFiled} of {hunter.cardTarget}. Calls used {hunter.capacity.callsUsed}.
                </p>
              ) : hunter.capacity ? (
                <p className="mt-2 text-sm text-muted">
                  Last capacity problem, {hunter.capacity.date}: filed {hunter.capacity.cardsFiled} of {hunter.cardTarget},
                  calls used {hunter.capacity.callsUsed}.
                </p>
              ) : null}
              {hunter.storage === "browser" ? (
                <p className="mt-2 text-sm text-shale">Redis is not connected. Pause cannot be saved.</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={savingHunter || hunter.storage !== "redis"}
              onClick={() => void toggleHunter()}
            >
              {hunter.paused ? "Resume" : "Pause"}
            </Button>
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
                <Button type="button" onClick={() => run(botForLead(lead.kind), false)}>
                  Draft
                </Button>
                <Button type="button" variant="outline" onClick={() => run(botForLead(lead.kind), true)}>
                  Send
                </Button>
                <Button type="button" variant="outline" onClick={() => run("followup", false)}>
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
