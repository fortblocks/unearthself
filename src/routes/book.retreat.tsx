import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { ENQUIRY_MAIL, ENQUIRY_MAILTO, sendEnquiryAlert } from "@/lib/enquiry";

export const Route = createFileRoute("/book/retreat")({
  component: RetreatHold,
  head: () => ({
    meta: [{ title: "Hold a date - Unearth Self" }],
  }),
});

function RetreatHold() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const g = (k: string) => String(data.get(k) ?? "");
    setStatus("sending");
    const res = await sendEnquiryAlert({
      form: "Retreat hold (/book/retreat)",
      subject: `Retreat hold — ${g("org") || "new"}`,
      replyTo: g("email"),
      honey: g("_honey"),
      fields: { name: g("name"), role: g("role"), organisation: g("org"), headcount: g("headcount"), dates: g("dates"), notes: g("notes") },
    });
    if (res.ok) setStatus("done");
    else {
      setError(res.error);
      setStatus("error");
    }
  }

  return (
    <main className="bg-fossil text-coal">
      <section className="mx-auto max-w-xl px-6 py-24">
        <p className="mb-3 text-[0.72rem] tracking-[0.28em] text-shale uppercase">Badlands Bootcamp</p>
        <h1 className="font-display mb-4 text-[clamp(2.4rem,6vw,4rem)] uppercase leading-[0.95]">
          Hold a date
        </h1>
        <p className="mb-10 text-coal/70">
          Tell us who is coming and when you can travel. We reply within one working day with
          availability.
        </p>
        {status === "done" ? (
          <p className="text-lg">Request sent. We reply within one working day with availability.</p>
        ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <input type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
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
          {status === "error" && (
            <p className="text-sm text-ember">
              That didn’t send ({error}). Please email us at{" "}
              <a className="underline" href={ENQUIRY_MAILTO}>{ENQUIRY_MAIL}</a>.
            </p>
          )}
          <button type="submit" disabled={status === "sending"} className="mt-2 rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white disabled:opacity-60">
            {status === "sending" ? "Sending…" : "Send request"}
          </button>
        </form>
        )}
        <p className="mt-8 text-sm text-coal/50">
          Looking for a room or a treatment?{" "}
          <Link to="/haven" className="underline">
            Haven
          </Link>
          {" / "}
          <Link to="/basecamp" className="underline">
            Basecamp
          </Link>
        </p>
      </section>
    </main>
  );
}
