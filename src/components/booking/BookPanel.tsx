"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { cad } from "@/data/treatments";
import { ROOMS, nightsBetween, type RoomSlug } from "@/data/rooms";
import { useBooking, type BookFace } from "@/lib/booking/context";

const TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const field =
  "w-full border border-coal/15 bg-white px-3 py-2.5 text-[0.95rem] text-coal outline-none focus:border-ember";
const label = "mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-shale uppercase";

const FACES: { id: BookFace; title: string; line: string }[] = [
  { id: "bootcamp", title: "Bootcamp", line: "Hold a date for 6–30 people" },
  { id: "basecamp", title: "Basecamp", line: "Treatments, heat and cold" },
  { id: "haven", title: "Haven", line: "Four suites on the block" },
];

export function BookPanel() {
  const { open, setOpen, face, setFace, lines } = useBooking();
  const [mounted, setMounted] = useState(false);
  const [inPos, setInPos] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setInPos(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setInPos(false);
    const t = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Close booking"
        className={"absolute inset-0 bg-coal/40 transition-opacity duration-300 " + (inPos ? "opacity-100" : "opacity-0")}
        onClick={() => setOpen(false)}
      />
      <aside
        className={
          "relative flex h-full w-full max-w-[28rem] flex-col bg-white text-coal shadow-2xl transition-transform duration-300 ease-out " +
          (inPos ? "translate-x-0" : "translate-x-full")
        }
      >
        <header className="flex items-center justify-between px-7 pt-7 pb-4">
          <div>
            <p className="text-[0.68rem] tracking-[0.2em] text-shale uppercase">Book</p>
            <p className="mt-1 text-sm text-coal/50">The expedition, the house, the treatments.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-coal/45 hover:text-coal">
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
          {FACES.map((f) => {
            const openBar = face === f.id;
            return (
              <div key={f.id} className="border-b border-coal/10">
                <button
                  type="button"
                  onClick={() => setFace(openBar ? null : f.id)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                  aria-expanded={openBar}
                >
                  <span>
                    <span className="font-display block text-2xl uppercase">{f.title}</span>
                    <span className="mt-0.5 block text-sm text-coal/45">
                      {f.id === "basecamp" && lines.length > 0
                        ? `${lines.length} treatment${lines.length === 1 ? "" : "s"} in the panel`
                        : f.line}
                    </span>
                  </span>
                  <span className="text-xl leading-none text-coal/35">{openBar ? "–" : "+"}</span>
                </button>
                {openBar && (
                  <div className="pb-6">
                    {f.id === "bootcamp" && <BootcampFace />}
                    {f.id === "basecamp" && <BasecampFace />}
                    {f.id === "haven" && <HavenFace />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function BootcampFace() {
  const [status, setStatus] = useState<"idle" | "done">("idle");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [headcount, setHeadcount] = useState("12");
  const [dates, setDates] = useState("");
  const [notes, setNotes] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = [
      `Name: ${name}`,
      `Role: ${role}`,
      `Organisation: ${org}`,
      `Email: ${email}`,
      `Headcount: ${headcount}`,
      `Dates: ${dates}`,
      `Notes: ${notes}`,
    ].join("\n");
    try {
      const existing = JSON.parse(localStorage.getItem("unearthself-retreat-requests") || "[]") as unknown[];
      localStorage.setItem(
        "unearthself-retreat-requests",
        JSON.stringify([{ receivedAt: new Date().toISOString(), name, role, org, email, headcount, dates, notes }, ...existing].slice(0, 50)),
      );
    } catch {
      /* ignore */
    }
    window.location.href = `mailto:hello@unearthself.xyz?subject=${encodeURIComponent("Retreat hold — " + (org || "new"))}&body=${encodeURIComponent(body)}`;
    setStatus("done");
  }

  if (status === "done") {
    return (
      <p className="text-sm text-coal/60">
        Request sent. We come back with availability and a figure.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label>
        <span className={label}>Name</span>
        <input required className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <span className={label}>Role</span>
        <input className={field} value={role} onChange={(e) => setRole(e.target.value)} />
      </label>
      <label>
        <span className={label}>Organisation</span>
        <input className={field} value={org} onChange={(e) => setOrg(e.target.value)} />
      </label>
      <label>
        <span className={label}>Email</span>
        <input required type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={label}>Headcount</span>
          <input required type="number" min={6} max={30} className={field} value={headcount} onChange={(e) => setHeadcount(e.target.value)} />
        </label>
        <label>
          <span className={label}>Preferred dates</span>
          <input required className={field} value={dates} onChange={(e) => setDates(e.target.value)} placeholder="e.g. 12–14 Nov" />
        </label>
      </div>
      <label>
        <span className={label}>Notes</span>
        <textarea rows={3} className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button type="submit" className="mt-1 w-full rounded-[2px] bg-ember py-3.5 font-semibold text-white">
        Hold a date
      </button>
      <p className="text-xs text-coal/45">6–30 people. Two to five days. Nothing charged until we confirm.</p>
    </form>
  );
}

function BasecampFace() {
  const { lines, removeLine, updateLine, clear, mode, setMode } = useBooking();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [status, setStatus] = useState<"idle" | "done">("idle");
  const total = lines.reduce((sum, l) => sum + l.price, 0);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const list = lines.map((l) => `${l.name} ${cad(l.price)} — ${l.date || "date TBC"} ${l.time}`).join("\n");
    const body = [`Mode: ${mode}`, `Name: ${name}`, `Email: ${email}`, `Phone: ${phone}`, "", list, `Total: ${cad(total)}`, "", notes].join("\n");
    try {
      const existing = JSON.parse(localStorage.getItem("unearthself-treatment-requests") || "[]") as unknown[];
      localStorage.setItem(
        "unearthself-treatment-requests",
        JSON.stringify([{ receivedAt: new Date().toISOString(), mode, name, email, phone, lines, notes }, ...existing].slice(0, 50)),
      );
    } catch {
      /* ignore */
    }
    window.location.href = `mailto:hello@unearthself.xyz?subject=${encodeURIComponent("Basecamp request")}&body=${encodeURIComponent(body)}`;
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div>
        <p className="font-display text-2xl uppercase">Request sent.</p>
        <p className="mt-2 text-sm text-coal/60">We confirm the slot. Nothing is charged until you accept that.</p>
        <button
          type="button"
          onClick={() => {
            clear();
            setStatus("idle");
          }}
          className="mt-4 text-sm text-ember"
        >
          Clear panel
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid grid-cols-2 gap-1 border border-coal/10 p-1">
        <button
          type="button"
          onClick={() => setMode("guest")}
          className={"py-2 text-[0.8rem] font-semibold " + (mode === "guest" ? "bg-coal text-fossil" : "text-coal/50")}
        >
          Guest
        </button>
        <button
          type="button"
          onClick={() => setMode("member")}
          className={"py-2 text-[0.8rem] font-semibold " + (mode === "member" ? "bg-coal text-fossil" : "text-coal/50")}
        >
          Member
        </button>
      </div>

      {lines.length === 0 ? (
        <p className="border border-dashed border-coal/15 px-4 py-6 text-center text-sm text-coal/45">
          Add a treatment from Basecamp. The + on each line puts it here.
        </p>
      ) : (
        <ul className="divide-y divide-coal/10 border-y border-coal/10">
          {lines.map((line) => (
            <li key={line.key} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{line.name}</p>
                  <p className="text-sm text-coal/45">
                    {line.mins} · {cad(line.price)}
                  </p>
                </div>
                <button type="button" onClick={() => removeLine(line.key)} className="text-xs tracking-wide text-coal/35 uppercase hover:text-coal">
                  Remove
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  min={todayIso()}
                  value={line.date}
                  onChange={(e) => updateLine(line.key, { date: e.target.value })}
                  className={field}
                  required
                />
                <select
                  value={line.time}
                  onChange={(e) => updateLine(line.key, { time: e.target.value })}
                  className={field}
                  required
                >
                  <option value="">Time</option>
                  {TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mode === "guest" ? (
        <div className="grid gap-3">
          <label>
            <span className={label}>Full name</span>
            <input required={lines.length > 0} className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className={label}>Email</span>
            <input required={lines.length > 0} type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            <span className={label}>Phone</span>
            <input type="tel" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            <span className={label}>Notes</span>
            <textarea rows={2} className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      ) : (
        <div className="grid gap-3">
          <label>
            <span className={label}>Email</span>
            <input required={lines.length > 0} type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            <span className={label}>Password</span>
            <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Accounts not live yet" />
          </label>
          <label className="flex items-start gap-3 text-sm text-coal/70">
            <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="mt-1" />
            Charge the card on file when the slot is confirmed
          </label>
          <label>
            <span className={label}>Note for the house</span>
            <textarea rows={2} className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      )}

      {lines.length > 0 && (
        <p className="flex justify-between text-sm">
          <span className="text-coal/50">Working total</span>
          <span className="tabular-nums">{cad(total)}</span>
        </p>
      )}
      <button type="submit" disabled={lines.length === 0} className="w-full rounded-[2px] bg-ember py-3.5 font-semibold text-white disabled:opacity-40">
        Request these times
      </button>
    </form>
  );
}

function HavenFace() {
  const [room, setRoom] = useState<RoomSlug | "">("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "done">("idle");
  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const existing = JSON.parse(localStorage.getItem("unearthself-haven-requests") || "[]") as unknown[];
      localStorage.setItem(
        "unearthself-haven-requests",
        JSON.stringify(
          [{ receivedAt: new Date().toISOString(), room: room || "any", checkIn, checkOut, nights, guests, name, email, notes }, ...existing].slice(0, 50),
        ),
      );
    } catch {
      /* ignore */
    }
    const body = [`Room: ${room || "any"}`, `Check-in: ${checkIn}`, `Check-out: ${checkOut}`, `Nights: ${nights}`, `Guests: ${guests}`, `Name: ${name}`, `Email: ${email}`, notes].join("\n");
    window.location.href = `mailto:hello@unearthself.xyz?subject=${encodeURIComponent("Haven stay request")}&body=${encodeURIComponent(body)}`;
    setStatus("done");
  }

  if (status === "done") {
    return <p className="text-sm text-coal/60">Request sent. We confirm what is free and send the rate.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label>
        <span className={label}>Room</span>
        <select className={field} value={room} onChange={(e) => setRoom(e.target.value as RoomSlug | "")}>
          <option value="">Any available</option>
          {ROOMS.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name} · sleeps {r.sleeps}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={label}>Check-in</span>
          <input type="date" min={todayIso()} className={field} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </label>
        <label>
          <span className={label}>Check-out</span>
          <input type="date" min={checkIn || todayIso()} className={field} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
      </div>
      <label>
        <span className={label}>Guests</span>
        <input type="number" min={1} max={8} className={field} value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} />
      </label>
      {nights > 0 && <p className="text-sm text-coal/50">{nights} night{nights === 1 ? "" : "s"} · rates on request</p>}
      <label>
        <span className={label}>Name</span>
        <input required className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <span className={label}>Email</span>
        <input required type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        <span className={label}>Notes</span>
        <textarea rows={2} className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button type="submit" className="w-full rounded-[2px] bg-ember py-3.5 font-semibold text-white">
        Request a stay
      </button>
      <p className="text-xs text-coal/45">No payment yet. Availability first.</p>
    </form>
  );
}
