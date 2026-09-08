import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent } from "react";

export const Route = createFileRoute("/book/retreat")({
  component: RetreatHold,
  head: () => ({
    meta: [{ title: "Hold a retreat date — Unearth Self" }],
  }),
});

function RetreatHold() {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = [
      `Name: ${data.get("name")}`,
      `Role: ${data.get("role")}`,
      `Organisation: ${data.get("org")}`,
      `Email: ${data.get("email")}`,
      `Headcount: ${data.get("headcount")}`,
      `Dates: ${data.get("dates")}`,
      `Notes: ${data.get("notes")}`,
    ].join("\n");
    window.location.href = `mailto:hello@unearthself.xyz?subject=${encodeURIComponent(
      "Retreat hold — " + String(data.get("org") || "new"),
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className="bg-fossil text-coal">
      <section className="mx-auto max-w-xl px-6 py-24">
        <p className="mb-3 text-[0.72rem] tracking-[0.28em] text-shale uppercase">Book · Retreat</p>
        <h1 className="font-display mb-4 text-[clamp(2.4rem,6vw,4rem)] uppercase leading-[0.95]">
          Hold a date
        </h1>
        <p className="mb-10 text-coal/70">
          Not a checkout. Tess and Christopher read this. We reply within one working day. No deposit
          until prices are signed.
        </p>
        <form onSubmit={onSubmit} className="grid gap-4">
          {[
            ["name", "Your name", "text"],
            ["role", "Role", "text"],
            ["org", "Organisation", "text"],
            ["email", "Email", "email"],
            ["headcount", "Headcount", "number"],
            ["dates", "Preferred dates", "text"],
          ].map(([id, label, type]) => (
            <label key={id} className="grid gap-1 text-sm">
              {label}
              <input
                required
                name={id}
                type={type}
                className="border border-coal/15 bg-white px-3 py-2.5 outline-none focus:border-ember"
              />
            </label>
          ))}
          <label className="grid gap-1 text-sm">
            Anything we should know
            <textarea name="notes" rows={4} className="border border-coal/15 bg-white px-3 py-2.5 outline-none focus:border-ember" />
          </label>
          <button type="submit" className="mt-2 rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white">
            Send hold request
          </button>
        </form>
        <p className="mt-8 text-sm text-coal/50">
          Looking for a room or a treatment instead?{" "}
          <Link to="/haven" className="underline">
            Haven
          </Link>{" "}
          ·{" "}
          <Link to="/basecamp" className="underline">
            Basecamp
          </Link>
        </p>
      </section>
    </main>
  );
}
