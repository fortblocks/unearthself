import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Section } from "@/components/desk/Section";
import { Stat } from "@/components/desk/Stat";
import { Button } from "@/components/ui/button";
import { FRIDAY } from "@/data/desk";
import { cad } from "@/lib/format";
import { openPipeline, useDesk, weightedPipeline } from "@/lib/desk-store";

export const Route = createFileRoute("/admin/friday")({
  component: FridayPage,
  head: () => ({ meta: [{ title: "Friday pack — Unearth Self Desk" }] }),
});

const TREND = [
  { week: "W31", occ: 28, hours: 9 },
  { week: "W32", occ: 41, hours: 11 },
  { week: "W33", occ: 55, hours: 14 },
  { week: "W34", occ: 48, hours: 16 },
  { week: "W35", occ: 62, hours: 18 },
];

function FridayPage() {
  const leads = useDesk((s) => s.leads);
  const money = useDesk((s) => s.money);
  const risk = useDesk((s) => s.risk);
  const reset = useDesk((s) => s.reset);
  const open = openPipeline(leads);
  const cashIn = money.filter((m) => m.status === "paid").reduce((s, m) => s + m.amount, 0);
  const promised = money
    .filter((m) => m.status === "due" || m.status === "overdue")
    .reduce((s, m) => s + m.amount, 0);
  const issues = risk.filter((r) => r.open);
  const bootcamp = open.filter((l) => l.kind === "bootcamp");

  return (
    <div className="grid gap-10">
      <p className="max-w-prose text-pretty text-muted">
        One page. Occupancy, treatment hours, retreat pipeline, cash, issues. Norah owns Friday
        numbers. This is the working pack for week of {FRIDAY.week}.
      </p>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Occupancy" value={`${Math.round(FRIDAY.occupancy * 100)}%`} hint="Haven, last seven" />
        <Stat label="Treatment hours" value={String(FRIDAY.treatmentHours)} hint="Sold, not offered" />
        <Stat
          label="Pipeline files"
          value={String(open.length)}
          hint={cad(weightedPipeline(leads)) + " weighted"}
        />
        <Stat label="Cash in" value={cad(cashIn)} hint="Paid this book" />
        <Stat label="Promised" value={cad(promised)} hint="Due or overdue" />
      </section>

      <section className="border border-line bg-paper p-5">
        <p className="mb-4 text-xs tracking-widest text-sandstone uppercase">Five weeks</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={TREND} barGap={6}>
              <XAxis
                dataKey="week"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--color-coal) 4%, transparent)" }}
                contentStyle={{
                  border: "1px solid var(--color-line)",
                  background: "var(--color-paper)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="occ" fill="var(--color-coal)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="hours" fill="var(--color-sandstone)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-muted">Coal is occupancy. Sandstone is treatment hours.</p>
      </section>

      <Section kicker="Retreat files still open">
        {bootcamp.length === 0 ? (
          <p className="text-muted">None. Unusual.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {bootcamp.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">{l.org}</p>
                  <p className="text-sm text-muted">
                    {l.dates} · {l.headcount} · {l.next}
                  </p>
                </div>
                <p className="text-sm tabular-nums">{cad(l.value * l.weight)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section kicker="Issues">
        {issues.length === 0 ? (
          <p className="text-muted">None open. Unusual, and good.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {issues.map((r) => (
              <li key={r.id} className="py-3">
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-pretty text-muted">{r.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          reset();
          toast("Book reset to this morning");
        }}
      >
        Reset demo book
      </Button>
    </div>
  );
}
