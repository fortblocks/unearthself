import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/desk/Section";
import { Stat } from "@/components/desk/Stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ROOMS, SUITES, SUPPLIERS, TODAY, type Channel, type SuiteSlug } from "@/data/desk";
import { clock } from "@/lib/format";
import { useDesk } from "@/lib/desk-store";

export const Route = createFileRoute("/admin/inventory")({
  component: InventoryPage,
  head: () => ({ meta: [{ title: "Inventory — Unearth Self Desk" }] }),
});

function days(from: string, n: number) {
  const out: string[] = [];
  const start = new Date(`${from}T12:00:00`);
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function nextDay(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function occupied(
  stays: { suite: SuiteSlug; checkIn: string; checkOut: string; guest: string }[],
  suite: SuiteSlug,
  day: string,
) {
  return stays.find((s) => s.suite === suite && s.checkIn <= day && s.checkOut > day);
}

function InventoryPage() {
  const stays = useDesk((s) => s.stays);
  const slots = useDesk((s) => s.slots);
  const canalta = useDesk((s) => s.canalta);
  const addStay = useDesk((s) => s.addStay);
  const addSlot = useDesk((s) => s.addSlot);
  const grid = days(TODAY, 10);
  const keysTonight = stays.filter((s) => s.checkIn <= TODAY && s.checkOut > TODAY).length;
  const [hold, setHold] = useState(false);
  const [treat, setTreat] = useState(false);
  const [draft, setDraft] = useState<{ suite: SuiteSlug; day: string } | null>(null);

  function onStay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const suite = (data.get("suite") as SuiteSlug) || "elowen";
    const guest = String(data.get("guest") || "Hold");
    const checkIn = String(data.get("checkIn") || TODAY);
    const checkOut = String(data.get("checkOut") || TODAY);
    const err = addStay({
      suite,
      guest,
      checkIn,
      checkOut,
      channel: (data.get("channel") as Channel) || "direct",
    });
    if (err === "held") {
      toast("That suite is held those nights");
      return;
    }
    toast(`Held ${SUITES.find((s) => s.slug === suite)?.name ?? suite}`);
    setHold(false);
    setDraft(null);
  }

  function onSlot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    addSlot({
      name: String(data.get("name") || "Treatment"),
      room: String(data.get("room") || "Clinician 2"),
      time: String(data.get("time") || "12:00"),
      mins: Number(data.get("mins") || 55),
      guest: String(data.get("guest") || ""),
      practitioner: String(data.get("practitioner") || "Norah"),
      price: Number(data.get("price") || 0),
    });
    toast("Slot filed");
    setTreat(false);
  }

  return (
    <div className="grid gap-10">
      <section className="grid gap-6 sm:grid-cols-3">
        <Stat label="Haven tonight" value={`${keysTonight} / 4`} hint="Direct keys" />
        <Stat label="Treatment slots" value={String(slots.length)} hint="Today, Basecamp" />
        <Stat
          label="Canalta hold"
          value={canalta.length ? `${canalta[0].rooms} rooms` : "None"}
          hint={canalta[0] ? canalta[0].forLead : "No overflow live"}
        />
      </section>

      <Section
        kicker="Haven · next ten nights"
        action={
          <Button type="button" variant="outline" onClick={() => setHold((v) => !v)}>
            {hold ? "Close" : "Hold a suite"}
          </Button>
        }
      >
        {hold || draft ? (
          <form
            key={`${draft?.suite ?? "x"}-${draft?.day ?? "x"}`}
            onSubmit={onStay}
            className="mb-5 grid gap-4 border border-line bg-paper p-5 md:grid-cols-2"
          >
            <label>
              <Label>Suite</Label>
              <NativeSelect name="suite" defaultValue={draft?.suite ?? "elowen"}>
                {SUITES.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label>
              <Label>Guest</Label>
              <Input name="guest" required placeholder="Name or hold label" />
            </label>
            <label>
              <Label>Check in</Label>
              <Input name="checkIn" type="date" defaultValue={draft?.day ?? TODAY} required />
            </label>
            <label>
              <Label>Check out</Label>
              <Input name="checkOut" type="date" defaultValue={draft ? nextDay(draft.day) : nextDay(TODAY)} required />
            </label>
            <label>
              <Label>Channel</Label>
              <NativeSelect name="channel">
                <option value="direct">Direct</option>
                <option value="canalta">Canalta</option>
                <option value="ota">OTA</option>
              </NativeSelect>
            </label>
            <div className="flex items-end">
              <Button type="submit">Hold it</Button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr>
                <th className="w-36 text-left font-semibold tracking-widest text-sandstone uppercase">Suite</th>
                {grid.map((d) => (
                  <th key={d} className="font-semibold tabular-nums text-muted">
                    {d.slice(8)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUITES.map((suite) => (
                <tr key={suite.slug}>
                  <td className="py-1 text-left font-semibold">{suite.name}</td>
                  {grid.map((d) => {
                    const stay = occupied(stays, suite.slug, d);
                    const start = stay && stay.checkIn === d;
                    return (
                      <td key={d} className="p-0">
                        <button
                          type="button"
                          title={stay ? stay.guest : "Open — hold"}
                          onClick={() => {
                            if (stay) return;
                            setDraft({ suite: suite.slug, day: d });
                            setHold(true);
                          }}
                          className={
                            stay
                              ? "flex min-h-11 w-full items-center justify-center truncate bg-coal px-1 text-fossil"
                              : "flex min-h-11 w-full items-center justify-center bg-paper text-muted ring-1 ring-line hover:ring-coal"
                          }
                        >
                          {stay ? (start ? stay.guest.split(" ")[0] : "—") : "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Empty cell holds a night. Name shows on the arrival morning.</p>
      </Section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Section
          kicker="Treatment rooms today"
          action={
            <Button type="button" variant="outline" onClick={() => setTreat((v) => !v)}>
              {treat ? "Close" : "Add slot"}
            </Button>
          }
        >
          {treat ? (
            <form onSubmit={onSlot} className="mb-5 grid gap-4 border border-line bg-paper p-5">
              <label>
                <Label>Treatment</Label>
                <Input name="name" required placeholder="Unearthed Bodyworks" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <Label>Time</Label>
                  <Input name="time" type="time" defaultValue="12:00" required />
                </label>
                <label>
                  <Label>Minutes</Label>
                  <Input name="mins" type="number" min={15} defaultValue={55} />
                </label>
              </div>
              <label>
                <Label>Room</Label>
                <NativeSelect name="room">
                  {ROOMS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label>
                <Label>Guest</Label>
                <Input name="guest" required />
              </label>
              <label>
                <Label>Practitioner</Label>
                <Input name="practitioner" defaultValue="Norah" />
              </label>
              <label>
                <Label>Price CAD</Label>
                <Input name="price" type="number" min={0} defaultValue={115} />
              </label>
              <Button type="submit">File slot</Button>
            </form>
          ) : null}
          <ul className="divide-y divide-line border-y border-line">
            {slots.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">
                    {clock(slot.time)} · {slot.name}
                  </p>
                  <p className="text-sm text-muted">
                    {slot.guest} · {slot.room} · {slot.practitioner}
                  </p>
                </div>
                <Badge tone="hold">{slot.mins}m</Badge>
              </li>
            ))}
          </ul>
        </Section>
        <div className="grid gap-8">
          <Section kicker="Overflow">
            {canalta.map((c) => (
              <div key={c.id} className="border border-line bg-paper p-4">
                <p className="font-semibold">{c.forLead}</p>
                <p className="mt-1 text-sm text-muted">
                  {c.rooms} rooms at Canalta · {c.checkIn} → {c.checkOut}
                </p>
                <p className="mt-3 text-sm text-pretty text-muted">
                  Haven takes the lead rooms. Overflow is held, not confirmed until D12.
                </p>
              </div>
            ))}
          </Section>
          <Section kicker="Partners on the book">
            <ul className="divide-y divide-line border-y border-line">
              {SUPPLIERS.map((s) => (
                <li key={s.name} className="py-3">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted">
                    {s.job} · {s.status}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </section>
    </div>
  );
}
