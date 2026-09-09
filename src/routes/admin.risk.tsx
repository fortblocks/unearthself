import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PARTNERS, type Partner, type RiskKind, type RiskLevel } from "@/data/desk";
import { partnerName, useDesk } from "@/lib/desk-store";

export const Route = createFileRoute("/admin/risk")({
  component: RiskPage,
  head: () => ({ meta: [{ title: "Risk — Unearth Self Desk" }] }),
});

function RiskPage() {
  const lookingAs = useDesk((s) => s.lookingAs);
  const risk = useDesk((s) => s.risk);
  const closeRisk = useDesk((s) => s.closeRisk);
  const reopenRisk = useDesk((s) => s.reopenRisk);
  const addRisk = useDesk((s) => s.addRisk);
  const [show, setShow] = useState(false);
  const open = risk.filter((r) => r.open);
  const blocks = open.filter((r) => r.level === "block");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") || "Untitled");
    addRisk({
      kind: (data.get("kind") as RiskKind) || "waiver",
      level: (data.get("level") as RiskLevel) || "watch",
      title,
      detail: String(data.get("detail") || ""),
      owner: (data.get("owner") as Partner) || lookingAs,
    });
    toast(`Opened · ${title}`);
    setShow(false);
  }

  return (
    <div className="grid gap-10">
      <section className="grid gap-6 sm:grid-cols-3">
        <Stat label="Open" value={String(open.length)} hint="Still live" />
        <Stat label="Blocks" value={String(blocks.length)} hint="Do not sell past these" />
        <Stat
          label="Waivers"
          value={String(open.filter((r) => r.kind === "waiver").length)}
          hint="Unsigned or incomplete"
        />
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={() => setShow((v) => !v)}>
          {show ? "Close form" : "New flag"}
        </Button>
      </div>

      {show ? (
        <form onSubmit={onSubmit} className="grid gap-4 border border-line bg-paper p-5 md:grid-cols-2">
          <label>
            <Label>Kind</Label>
            <NativeSelect name="kind">
              <option value="waiver">Waiver</option>
              <option value="weather">Weather</option>
              <option value="staffing">Staffing</option>
            </NativeSelect>
          </label>
          <label>
            <Label>Level</Label>
            <NativeSelect name="level">
              <option value="watch">Watch</option>
              <option value="block">Block</option>
            </NativeSelect>
          </label>
          <label className="md:col-span-2">
            <Label>Title</Label>
            <Input name="title" required placeholder="What is the problem" />
          </label>
          <label className="md:col-span-2">
            <Label>Detail</Label>
            <Input name="detail" required placeholder="What a human must do" />
          </label>
          <label>
            <Label>Owner</Label>
            <NativeSelect name="owner" defaultValue={lookingAs}>
              {PARTNERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </label>
          <div className="flex items-end">
            <Button type="submit">Flag it</Button>
          </div>
        </form>
      ) : null}

      <ul className="grid gap-4">
        {risk.map((r) => (
          <li
            key={r.id}
            className={
              r.open
                ? "grid gap-3 border border-line bg-paper p-5 md:grid-cols-[1fr_auto] md:items-start"
                : "grid gap-3 border border-line p-5 opacity-50 md:grid-cols-[1fr_auto]"
            }
          >
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={r.level}>{r.level}</Badge>
                <Badge tone={r.open ? "new" : "closed"}>{r.kind}</Badge>
              </div>
              <h2 className="mt-3 font-display text-3xl font-black uppercase text-balance">{r.title}</h2>
              <p className="mt-2 max-w-prose text-pretty text-muted">{r.detail}</p>
              <p className="mt-3 text-xs tracking-widest text-sandstone uppercase">{partnerName(r.owner)}</p>
            </div>
            {r.open ? (
              <Button
                type="button"
                variant="coal"
                onClick={() => {
                  closeRisk(r.id);
                  toast(`Closed · ${r.title}`);
                }}
              >
                Close it
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => reopenRisk(r.id)}>
                Reopen
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
