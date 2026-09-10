"use client";

import { FormEvent, useMemo, useState } from "react";
import { ROOMS, nightsBetween, type RoomSlug } from "@/data/rooms";
import { quoteStay } from "@/data/havenRates";
import { cad } from "@/lib/format";

type Props = {
  presetSlug?: RoomSlug;
  tone?: "light" | "dark";
};

const STORAGE_KEY = "unearthself-haven-requests";

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function StayRequest({ presetSlug, tone = "light" }: Props) {
  const [room, setRoom] = useState<RoomSlug | "">(presetSlug ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const quote = useMemo(
    () => (room && checkIn && checkOut ? quoteStay(room, checkIn, checkOut) : null),
    [room, checkIn, checkOut],
  );
  const dark = tone === "dark";
  const field =
    "w-full rounded-[2px] border bg-transparent px-3 py-2.5 text-[0.95rem] outline-none focus:border-ember " +
    (dark ? "border-fossil/25 text-fossil placeholder:text-fossil/40" : "border-coal/15 text-coal placeholder:text-shale/50");
  const label = "mb-1.5 block text-[0.72rem] font-semibold tracking-[0.12em] uppercase " + (dark ? "text-sandstone" : "text-shale");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (checkIn && checkOut && nights < 1) {
      setError("Check-out needs to be after check-in.");
      return;
    }
    setStatus("sending");
    try {
      const request = {
        id: `stay_${Date.now()}`,
        receivedAt: new Date().toISOString(),
        room: room || "any",
        checkIn,
        checkOut,
        nights,
        guests,
        indicativeTotal: quote?.total ?? null,
        name: name.trim(),
        email: email.trim(),
        notes: notes.trim(),
      };
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as unknown[];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([request, ...existing].slice(0, 50)));
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Could not send the request. Try again, or email hello@unearthself.xyz.");
    }
  }

  if (status === "done") {
    return (
      <div className={dark ? "text-fossil" : "text-coal"}>
        <p className="font-display text-2xl">Request received</p>
        <p className={"mt-3 max-w-[42ch] " + (dark ? "text-fossil/75" : "text-shale")}>
          We’ll reply to confirm availability
          {room ? ` for ${ROOMS.find((r) => r.slug === room)?.name}` : ""}
          {nights ? ` · ${nights} night${nights === 1 ? "" : "s"}` : ""}. Rates and final details come next.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Room</span>
          <select
            className={field}
            value={room}
            onChange={(e) => setRoom(e.target.value as RoomSlug | "")}
            aria-label="Room"
          >
            <option value="">Any available</option>
            {ROOMS.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Guests</span>
          <input
            className={field}
            type="number"
            min={1}
            max={8}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value) || 1)}
          />
        </label>
        <label className="block">
          <span className={label}>Check-in</span>
          <input
            className={field}
            type="date"
            min={todayIso()}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={label}>Check-out</span>
          <input
            className={field}
            type="date"
            min={checkIn || todayIso()}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
      </div>
      {quote && (
        <p className={"text-sm " + (dark ? "text-fossil/70" : "text-shale")}>
          {quote.nights} night{quote.nights === 1 ? "" : "s"}
          {quote.monthly ? " · monthly rate" : ""} · about {cad(quote.total)}
          <span className={dark ? " text-fossil/45" : " text-shale/70"}>
            {" "}
            ({cad(quote.subtotal)} + {cad(quote.clean)} clean)
          </span>
          . We confirm the total with the dates.
        </p>
      )}
      {nights > 0 && !quote && (
        <p className={"text-sm " + (dark ? "text-fossil/70" : "text-shale")}>
          {nights} night{nights === 1 ? "" : "s"} · pick a room to see an indicative total
        </p>
      )}
      <label className="block">
        <span className={label}>Name</span>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      </label>
      <label className="block">
        <span className={label}>Email</span>
        <input
          className={field}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <label className="block">
        <span className={label}>Notes</span>
        <textarea
          className={field + " min-h-24 resize-y"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Arrival time, which room you prefer, anything we should know."
        />
      </label>
      {error && <p className="text-sm text-ember">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white hover:bg-ember-soft disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Request a stay"}
      </button>
      <p className={"text-[0.8rem] " + (dark ? "text-fossil/50" : "text-shale/80")}>
        No payment yet. This is an availability request — we’ll confirm by email.
      </p>
    </form>
  );
}
