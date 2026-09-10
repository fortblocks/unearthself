import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/desk/Chip";
import { Section } from "@/components/desk/Section";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOTS, type BotId } from "@/data/bots";
import { partnerFirst, useDesk } from "@/lib/desk-store";
import { botForLead } from "@/lib/bot-copy";

export const Route = createFileRoute("/admin/bots")({
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
};

function BotsPage() {
  const search = Route.useSearch();
  const leads = useDesk((s) => s.leads);
  const threads = useDesk((s) => s.threads);
  const scout = useDesk((s) => s.scout);
  const paused = useDesk((s) => s.paused);
  const toggleBot = useDesk((s) => s.toggleBot);
  const draftMail = useDesk((s) => s.draftMail);
  const sendMail = useDesk((s) => s.sendMail);
  const logReply = useDesk((s) => s.logReply);
  const stopLead = useDesk((s) => s.stopLead);
  const fileScout = useDesk((s) => s.fileScout);
  const skipScout = useDesk((s) => s.skipScout);
  const [leadId, setLeadId] = useState(search.lead || leads[0]?.id || "");
  const [tab, setTab] = useState<"queue" | "roster" | "scout">("queue");

  const lead = leads.find((l) => l.id === leadId) ?? leads[0];
  const mail = useMemo(
    () => (lead ? threads.filter((m) => m.leadId === lead.id) : []),
    [lead, threads],
  );
  const queued = threads.filter((m) => m.dir === "draft").length;
  const dueFollow = leads.filter(
    (l) => !l.stopped && l.status !== "lost" && l.status !== "won" && l.nudges > 0 && l.nudges < 3,
  ).length;
  const watch = scout.filter((t) => t.status === "watch");

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

      <section className="grid gap-6 sm:grid-cols-3">
        <Stat label="Drafts waiting" value={String(queued)} hint="Human still sends" />
        <Stat label="Follow-up live" value={String(dueFollow)} hint="Nudge 1 or 2" />
        <Stat label="Scout watch" value={String(watch.length)} hint="Not a named person" />
      </section>

      <div className="flex flex-wrap gap-2">
        <Chip active={tab === "queue"} onClick={() => setTab("queue")}>
          Queue
        </Chip>
        <Chip active={tab === "roster"} onClick={() => setTab("roster")}>
          Roster
        </Chip>
        <Chip active={tab === "scout"} onClick={() => setTab("scout")}>
          Scout
        </Chip>
      </div>

      {tab === "roster" ? (
        <ul className="grid gap-3">
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

      {tab === "scout" ? (
        <Section kicker="Calgary / Edmonton — research only">
          <p className="mb-4 max-w-prose text-sm text-pretty text-muted">
            These are sectors, not contacts. Filing puts a card on the pipeline. Concierge will
            refuse to send until someone has a name.
          </p>
          <ul className="grid gap-3">
            {scout.map((t) => (
              <li key={t.id} className="grid gap-3 border border-line bg-paper p-4 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <Badge tone={t.status === "filed" ? "won" : t.status === "skip" ? "lost" : "hold"}>
                    {t.status}
                  </Badge>
                  <h2 className="mt-2 font-display text-3xl font-black uppercase leading-none">{t.org}</h2>
                  <p className="mt-2 text-sm text-muted">
                    {t.city} · {t.sector}
                  </p>
                  <p className="mt-2 max-w-prose text-sm text-pretty">{t.why}</p>
                </div>
                {t.status === "watch" ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        const id = fileScout(t.id);
                        if (id) {
                          setLeadId(id);
                          setTab("queue");
                          toast(`Filed ${t.org}`);
                        }
                      }}
                    >
                      File
                    </Button>
                    <Button type="button" variant="outline" onClick={() => skipScout(t.id)}>
                      Skip
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

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
                        {l.id} · {l.nudges}/3 · {l.source}
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
