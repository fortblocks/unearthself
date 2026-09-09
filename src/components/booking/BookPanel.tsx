"use client";

import { FormEvent, useEffect, useState } from "react";
import { useBooking } from "@/lib/booking/context";

const TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const field =
  "w-full border border-coal/15 bg-white px-3 py-2.5 text-[0.95rem] text-coal outline-none focus:border-ember";
const label = "mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-shale uppercase";

export function BookPanel() {
  const { open, setOpen, lines, removeLine, updateLine, clear, mode, setMode } = useBooking();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [status, setStatus] = useState<"idle" | "done">("idle");

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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const list = lines.map((l) => `${l.name} — ${l.date || "date TBC"} ${l.time}`).join("\n");
    const body = [
      `Mode: ${mode}`,
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      "",
      list,
      "",
      notes,
    ].join("\n");
    try {
      const existing = JSON.parse(localStorage.getItem("unearthself-treatment-requests") || "[]") as unknown[];
      localStorage.setItem(
        "unearthself-treatment-requests",
        JSON.stringify([{ receivedAt: new Date().toISOString(), mode, name, email, phone, lines, notes }, ...existing].slice(0, 50)),
      );
    } catch {
      /* ignore */
    }
    window.location.href = `mailto:hello@unearthself.xyz?subject=${encodeURIComponent(
      "Basecamp request",
    )}&body=${encodeURIComponent(body)}`;
    setStatus("done");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" aria-label="Close booking" className="absolute inset-0 bg-coal/40" onClick={() => setOpen(false)} />
      <aside className="relative flex h-full w-full max-w-[28rem] flex-col bg-white text-coal shadow-2xl">
        <header className="flex items-center justify-between px-7 pt-7 pb-5">
          <div>
            <p className="text-[0.68rem] tracking-[0.2em] text-shale uppercase">Your booking</p>
            <p className="mt-1 text-sm text-coal/50">{lines.length === 0 ? "Nothing added yet" : `${lines.length} treatment${lines.length === 1 ? "" : "s"}`}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-coal/45 hover:text-coal">
            Close
          </button>
        </header>

        {status === "done" ? (
          <div className="px-7 py-8">
            <h2 className="font-display text-3xl uppercase">Request sent.</h2>
            <p className="mt-3 max-w-[32ch] text-coal/60">
              We confirm the rooms and send the rate. Nothing is charged until you accept that.
            </p>
            <button
              type="button"
              onClick={() => {
                clear();
                setStatus("idle");
                setOpen(false);
              }}
              className="mt-8 rounded-[2px] bg-ember px-6 py-3 font-semibold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
              <div className="mb-6 grid grid-cols-2 gap-1 border border-coal/10 p-1">
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
                <p className="border border-dashed border-coal/15 px-4 py-8 text-center text-sm text-coal/45">
                  Add a treatment from Basecamp. The + on each line puts it here.
                </p>
              ) : (
                <ul className="mb-8 divide-y divide-coal/10 border-y border-coal/10">
                  {lines.map((line) => (
                    <li key={line.key} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{line.name}</p>
                          <p className="text-sm text-coal/45">{line.mins}</p>
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
                <div className="grid gap-4">
                  <p className="text-[0.68rem] tracking-[0.16em] text-shale uppercase">Guest details</p>
                  <label>
                    <span className={label}>Full name</span>
                    <input required className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </label>
                  <label>
                    <span className={label}>Email</span>
                    <input required type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </label>
                  <label>
                    <span className={label}>Phone</span>
                    <input type="tel" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                  </label>
                  <label>
                    <span className={label}>Notes</span>
                    <textarea rows={3} className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </label>
                  <p className="text-sm text-coal/45">
                    Card is taken when the slot is confirmed. Guests pay per visit.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  <p className="text-[0.68rem] tracking-[0.16em] text-shale uppercase">Member</p>
                  <label>
                    <span className={label}>Email</span>
                    <input required type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
                  </label>
                  <label>
                    <span className={label}>Password</span>
                    <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Accounts not live yet" />
                  </label>
                  <p className="text-sm text-coal/45">
                    Members skip name and phone — we already have them. Login is designed here; it is not wired.
                  </p>
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
            </div>

            <div className="border-t border-coal/10 px-7 py-5">
              <button
                type="submit"
                disabled={lines.length === 0}
                className="w-full rounded-[2px] bg-ember py-3.5 font-semibold text-white disabled:opacity-40"
              >
                Request these times
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}
