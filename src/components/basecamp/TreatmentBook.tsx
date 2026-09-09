"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TREATMENT_GROUPS, TREATMENTS, type Treatment } from "@/data/treatments";

const TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function TreatmentBook() {
  const [open, setOpen] = useState(false);
  const [treatmentId, setTreatmentId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [who, setWho] = useState<"guest" | "regular">("guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "done">("idle");

  const selected = useMemo(
    () => TREATMENTS.find((t) => t.id === treatmentId),
    [treatmentId],
  );

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
  }, [open]);

  function openFor(t?: Treatment) {
    setStatus("idle");
    if (t) setTreatmentId(t.id);
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = [
      `Who: ${who}`,
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Treatment: ${selected?.name ?? treatmentId}`,
      `Date: ${date}`,
      `Time: ${time}`,
      `Notes: ${notes}`,
    ].join("\n");
    try {
      const existing = JSON.parse(localStorage.getItem("unearthself-treatment-requests") || "[]") as unknown[];
      localStorage.setItem(
        "unearthself-treatment-requests",
        JSON.stringify(
          [{ receivedAt: new Date().toISOString(), who, name, email, phone, treatmentId, date, time, notes }, ...existing].slice(0, 50),
        ),
      );
    } catch {
      /* ignore */
    }
    window.location.href = `mailto:hello@unearthself.xyz?subject=${encodeURIComponent(
      "Treatment request - " + (selected?.name ?? "Basecamp"),
    )}&body=${encodeURIComponent(body)}`;
    setStatus("done");
  }

  return (
    <>
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.82) 0%, rgba(22,23,24,0.28) 55%), url('/images/basecamp/lounge.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Drumheller - treatments and the house
          </p>
          <h1 className="font-display mb-5 text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.9] uppercase">
            Come in from
            <br />
            the land.
          </h1>
          <p className="mb-8 max-w-[40ch] text-lg text-fossil/85">
            Basecamp is heat, cold, hands and quiet. Open to guests in Haven and to anyone driving in
            for the day.
          </p>
          <button
            type="button"
            onClick={() => openFor()}
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Request a treatment
          </button>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The house</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Not a gym floor with a candle.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            Fire and Ice for sauna, steam and plunge. Tables for bodywork and facials. A room for a
            small class. Haven is the other door of the same building if you want to sleep here.
          </p>
          <p className="text-lg text-fossil/80">
            Locals and day guests use the same rooms as people on a Bootcamp. We keep the diaries
            apart so a private group is not sharing the steam with the town.
          </p>
        </div>
      </section>

      <section id="menu" className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The menu</p>
          <h2 className="font-display mb-4 text-4xl uppercase">What we do here.</h2>
          <p className="mb-14 max-w-[46ch] text-fossil/70">
            Pick a treatment. Choose a day. We confirm the room and send the rate before anything is
            charged.
          </p>
          <div className="grid gap-16">
            {TREATMENT_GROUPS.map((g) => (
              <div key={g.id}>
                <h3 className="font-display mb-2 text-2xl uppercase">{g.title}</h3>
                <p className="mb-8 max-w-[46ch] text-fossil/55">{g.line}</p>
                <ul className="grid gap-x-16 gap-y-1 md:grid-cols-2">
                  {TREATMENTS.filter((t) => t.group === g.id).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openFor(t)}
                        className="flex w-full items-baseline gap-4 border-b border-fossil/10 py-4 text-left hover:border-fossil/30"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-fossil">{t.name}</span>
                          <span className="mt-1 block text-sm text-fossil/45">{t.line}</span>
                        </span>
                        <span className="w-16 shrink-0 text-right text-sm tabular-nums text-sandstone">
                          {t.mins.replace(" min", "m")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openFor()}
            className="mt-14 inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Request a treatment
          </button>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-coal/70"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-fossil/10 bg-coal text-fossil shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-fossil/10">
              <p className="text-[0.72rem] tracking-[0.22em] text-sandstone uppercase">Book</p>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-fossil/60">
                Close
              </button>
            </div>

            {status === "done" ? (
              <div className="px-6 py-10">
                <h2 className="font-display text-3xl uppercase">Request sent.</h2>
                <p className="mt-4 text-fossil/70">
                  We will confirm the room and send the rate. Nothing is charged until you accept that.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-8 rounded-[2px] bg-ember px-6 py-3 font-semibold text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5 px-6 py-6">
                <div className="grid grid-cols-2 gap-2 rounded-[2px] border border-fossil/15 p-1">
                  <button
                    type="button"
                    onClick={() => setWho("guest")}
                    className={
                      "rounded-[2px] py-2 text-sm " +
                      (who === "guest" ? "bg-fossil text-coal" : "text-fossil/70")
                    }
                  >
                    Guest
                  </button>
                  <button
                    type="button"
                    onClick={() => setWho("regular")}
                    className={
                      "rounded-[2px] py-2 text-sm " +
                      (who === "regular" ? "bg-fossil text-coal" : "text-fossil/70")
                    }
                  >
                    Regular
                  </button>
                </div>
                {who === "regular" && (
                  <p className="text-sm text-fossil/50">
                    Accounts are not live yet. Use the same email you will keep. We will attach this
                    request when login lands.
                  </p>
                )}

                <label className="grid gap-1.5 text-sm">
                  Treatment
                  <select
                    required
                    value={treatmentId}
                    onChange={(e) => setTreatmentId(e.target.value)}
                    className="border border-fossil/20 bg-transparent px-3 py-2.5 outline-none focus:border-ember"
                  >
                    <option value="">Choose one</option>
                    {TREATMENTS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.mins})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm">
                  Date
                  <input
                    required
                    type="date"
                    min={todayIso()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="border border-fossil/20 bg-transparent px-3 py-2.5 outline-none focus:border-ember"
                  />
                </label>

                <fieldset className="grid gap-2">
                  <legend className="text-sm">Time</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {TIMES.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        className={
                          "border px-2 py-2 text-sm tabular-nums " +
                          (time === slot
                            ? "border-ember bg-ember/15 text-fossil"
                            : "border-fossil/20 text-fossil/70 hover:border-fossil/40")
                        }
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="grid gap-1.5 text-sm">
                  Name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="border border-fossil/20 bg-transparent px-3 py-2.5 outline-none focus:border-ember"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Email
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="border border-fossil/20 bg-transparent px-3 py-2.5 outline-none focus:border-ember"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Phone
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    className="border border-fossil/20 bg-transparent px-3 py-2.5 outline-none focus:border-ember"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Notes
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="border border-fossil/20 bg-transparent px-3 py-2.5 outline-none focus:border-ember"
                  />
                </label>

                <div className="border border-fossil/15 px-4 py-3 text-sm text-fossil/60">
                  Payment is not taken in this panel. When D03 booking is live, regulars will pay on a
                  saved card and guests will pay when the slot is confirmed.
                </div>

                <button type="submit" className="mt-auto rounded-[2px] bg-ember px-6 py-3.5 font-semibold text-white">
                  Request this time
                </button>
              </form>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
