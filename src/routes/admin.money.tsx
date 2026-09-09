import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { TODAY, type MoneyKind } from "@/data/desk";
import { cad, shortDate } from "@/lib/format";
import { useDesk } from "@/lib/desk-store";

export const Route = createFileRoute("/admin/money")({
  component: MoneyPage,
  head: () => ({ meta: [{ title: "Money — Unearth Self Desk" }] }),
});

function MoneyPage() {
  const money = useDesk((s) => s.money);
  const markMoney = useDesk((s) => s.markMoney);
  const addMoney = useDesk((s) => s.addMoney);
  const [show, setShow] = useState(false);
  const due = money.filter((m) => m.status === "due" || m.status === "overdue");
  const promised = due.reduce((s, m) => s + m.amount, 0);
  const inHand = money.filter((m) => m.status === "paid").reduce((s, m) => s + m.amount, 0);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const party = String(data.get("party") || "Untitled");
    addMoney({
      kind: (data.get("kind") as MoneyKind) || "invoice",
      party,
      amount: Number(data.get("amount") || 0),
      due: String(data.get("due") || TODAY),
      note: String(data.get("note") || ""),
    });
    toast(`Filed ${party}`);
    setShow(false);
  }

  return (
    <div className="grid gap-10">
      <section className="grid gap-6 sm:grid-cols-3">
        <Stat label="In" value={cad(inHand)} hint="Marked paid" />
        <Stat label="Promised" value={cad(promised)} hint="Due or overdue" />
        <Stat
          label="Overdue"
          value={String(money.filter((m) => m.status === "overdue").length)}
          hint="Needs Norah"
        />
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={() => setShow((v) => !v)}>
          {show ? "Close form" : "New line"}
        </Button>
      </div>

      {show ? (
        <form onSubmit={onSubmit} className="grid gap-4 border border-line bg-paper p-5 md:grid-cols-2">
          <label>
            <Label>Kind</Label>
            <NativeSelect name="kind">
              <option value="deposit">Deposit</option>
              <option value="invoice">Invoice</option>
              <option value="refund">Refund</option>
            </NativeSelect>
          </label>
          <label>
            <Label>Party</Label>
            <Input name="party" required placeholder="Who owes, or who we owe" />
          </label>
          <label>
            <Label>Amount CAD</Label>
            <Input name="amount" type="number" min={0} required />
          </label>
          <label>
            <Label>Due</Label>
            <Input name="due" type="date" defaultValue={TODAY} />
          </label>
          <label className="md:col-span-2">
            <Label>Note</Label>
            <Input name="note" placeholder="Why this line exists" />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">File it</Button>
          </div>
        </form>
      ) : null}

      <section className="grid gap-3">
        {money.map((m) => (
          <article
            key={m.id}
            className="grid gap-3 border border-line bg-paper p-4 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={m.kind === "refund" ? "overdue" : m.kind === "deposit" ? "hold" : "new"}>
                  {m.kind}
                </Badge>
                <Badge tone={m.status}>{m.status}</Badge>
              </div>
              <p className="mt-2 font-semibold">{m.party}</p>
              <p className="text-sm text-pretty text-muted">{m.note}</p>
              <p className="mt-2 text-sm tabular-nums">
                {cad(m.amount)}
                <span className="text-muted"> · {shortDate(m.due)}</span>
              </p>
            </div>
            {m.status !== "paid" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  markMoney(m.id, "paid");
                  toast(`Paid · ${m.party}`);
                }}
              >
                Mark paid
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => markMoney(m.id, "due")}>
                Undo
              </Button>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
