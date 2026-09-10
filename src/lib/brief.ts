import { TODAY, type Lead, type MoneyRow, type Partner, type RiskRow, type Stay, type TreatmentSlot } from "@/data/desk";
import { cad } from "@/lib/format";
import { openPipeline, partnerFirst, weightedPipeline } from "@/lib/desk-store";

export type Pull = { label: string; to: "/admin" | "/admin/pipeline" | "/admin/inventory" | "/admin/money" | "/admin/risk" | "/admin/bots" | "/admin/socials" };

export type Brief = {
  kicker: string;
  line: string;
  pulls: Pull[];
};

function occupied(stay: Stay) {
  return stay.checkIn <= TODAY && stay.checkOut > TODAY;
}

export function buildBrief(args: {
  partner: Partner;
  leads: Lead[];
  stays: Stay[];
  slots: TreatmentSlot[];
  money: MoneyRow[];
  risk: RiskRow[];
}): Brief {
  const { partner, leads, stays, slots, money, risk } = args;
  const openRisk = risk.filter((r) => r.open);
  const mineRisk = openRisk.filter((r) => r.owner === partner);
  const mineLeads = openPipeline(leads).filter((l) => l.owner === partner);
  const keys = stays.filter(occupied).length;
  const due = money.filter((m) => m.status === "due" || m.status === "overdue");
  const overdue = money.filter((m) => m.status === "overdue");
  const first = partnerFirst(partner);

  if (partner === "lisa") {
    const unsigned = openRisk.filter((r) => r.kind === "waiver");
    const sunday = openRisk.find((r) => r.id === "R-04" && r.open);
    const bits = [`${keys} / 4 keys in`];
    if (unsigned.length) bits.push(`${unsigned.length} unsigned waiver${unsigned.length === 1 ? "" : "s"}`);
    if (sunday) bits.push("do not sell Sunday thermal");
    return {
      kicker: `Your desk · ${first}`,
      line: bits.join(". ") + ".",
      pulls: [
        ...unsigned.slice(0, 2).map((r) => ({ label: r.title, to: "/admin/risk" as const })),
        { label: "Haven grid", to: "/admin/inventory" },
      ],
    };
  }

  if (partner === "norah") {
    const bits = [
      `${slots.length} treatment${slots.length === 1 ? "" : "s"} today`,
      due.length ? `${cad(due.reduce((s, m) => s + m.amount, 0))} promised` : "nothing promised",
    ];
    if (overdue.length) bits.push(`${overdue.length} overdue`);
    return {
      kicker: `Your desk · ${first}`,
      line: bits.join(". ") + ".",
      pulls: [
        { label: "Diary", to: "/admin/inventory" },
        { label: "Money", to: "/admin/money" },
        ...mineLeads.slice(0, 1).map((l) => ({ label: l.org, to: "/admin/pipeline" as const })),
      ],
    };
  }

  if (partner === "tess") {
    const weather = openRisk.find((r) => r.kind === "weather");
    const bits = mineLeads.length
      ? [`${mineLeads.length} file${mineLeads.length === 1 ? "" : "s"} on you`]
      : ["no open files on you"];
    if (weather) bits.push(weather.title);
    bits.push("Apex run-of-show is a draft until D13");
    return {
      kicker: `Your desk · ${first}`,
      line: bits.join(". ") + ".",
      pulls: [
        ...mineLeads.slice(0, 2).map((l) => ({ label: l.org, to: "/admin/pipeline" as const })),
        ...(weather ? [{ label: weather.title, to: "/admin/risk" as const }] : []),
      ],
    };
  }

  const apex = leads.find((l) => l.id === "L-041" && l.status !== "lost" && l.status !== "won");
  return {
    kicker: `Your desk · ${first}`,
    line: apex
      ? `Apex one-pager is Friday. ${openPipeline(leads).length} files open, ${cad(weightedPipeline(leads))} weighted.`
      : `${openPipeline(leads).length} files open, ${cad(weightedPipeline(leads))} weighted.`,
    pulls: [
      { label: apex ? "Apex Energy" : "Pipeline", to: "/admin/pipeline" },
      { label: "Bots", to: "/admin/bots" },
      ...mineRisk.slice(0, 1).map((r) => ({ label: r.title, to: "/admin/risk" as const })),
    ],
  };
}
