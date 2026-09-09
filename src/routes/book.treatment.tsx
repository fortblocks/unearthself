import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent } from "react";
import { TREATMENTS } from "@/data/treatments";

export const Route = createFileRoute("/book/treatment")({
  component: TreatmentHold,
  head: () => ({
    meta: [{ title: "Request a treatment - Unearth Self" }],
  }),
});

function TreatmentHold() {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Treatment: ${data.get("treatment")}`,
      `Date: ${data.get("date")}`,
      `Time: ${data.get("time")}`,
      `Notes: ${data.get("notes")}`,
    ].join("\n");
    window.location.href = `mailto:hello@unearthself.xyz?subject=${encodeURIComponent(
      "Treatment request - " + String(data.get("treatment") || "Basecamp"),
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className="bg-fossil text-coal">
      <section className="mx-auto max-w-xl px-6 py-24">
        <p className="mb-3 text-[0.72rem] tracking-[0.28em] text-shale uppercase">Basecamp</p>
        <h1 className="font-display mb-4 text-[clamp(2.4rem,6vw,4rem)] uppercase leading-[0.95]">
          Request a treatment
        </h1>
        <p className="mb-10 text-coal/70">
          Tell us what you want and when you can come. We reply with the rate and a confirmed time.
        </p>
        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="grid gap-1 text-sm">
            Treatment
            <select name="treatment" required className="border border-coal/15 bg-white px-3 py-2.5 outline-none focus:border-ember">
              <option value="">Choose one</option>
              {TREATMENTS.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.mins})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Your name
            <input required name="name" type="text" className="border border-coal/15 bg-white px-3 py-2.5 outline-none focus:border-ember" />
          </label>
          <label className="grid gap-1 text-sm">
            Email
            <input required name="email" type="email" className="border border-coal/15 bg-white px-3 py-2.5 outline-none focus:border-ember" />
          </label>
          <label className="grid gap-1 text-sm">
            Preferred date
            <input name="date" type="date" className="border border-coal/15 bg-white px-3 py-2.5 outline-none focus:border-ember" />
          </label>
          <label className="grid gap-1 text-sm">
            Preferred time
            <input name="time" type="text" placeholder="Morning / afternoon / a time" className="border border-coal/15 bg-white px-3 py-2.5 outline-none focus:border-ember" />
          </label>
          <label className="grid gap-1 text-sm">
            Anything we should know
            <textarea name="notes" rows={4} className="border border-coal/15 bg-white px-3 py-2.5 outline-none focus:border-ember" />
          </label>
          <button type="submit" className="mt-2 rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white">
            Send request
          </button>
        </form>
        <p className="mt-8 text-sm text-coal/50">
          Staying the night?{" "}
          <Link to="/haven" className="underline">
            Haven
          </Link>
          {" / "}
          <Link to="/for/teams" className="underline">
            Teams
          </Link>
        </p>
      </section>
    </main>
  );
}
