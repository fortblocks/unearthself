import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { submitSpringEnquiry, mailSpringEnquiry } from "@/lib/enquiry";
import { ingestSpringEnquiry } from "@/lib/desk-store";

type Search = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

export const Route = createFileRoute("/spring")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    utm_source: typeof raw.utm_source === "string" ? raw.utm_source.slice(0, 80) : "",
    utm_medium: typeof raw.utm_medium === "string" ? raw.utm_medium.slice(0, 80) : "",
    utm_campaign: typeof raw.utm_campaign === "string" ? raw.utm_campaign.slice(0, 80) : "",
  }),
  component: SpringPage,
  head: () => ({
    meta: [
      { title: "Spring 2027 — first teams | Unearth Self" },
      {
        name: "description",
        content:
          "Canada’s newest corporate expedition. Badlands Bootcamp in Drumheller. Enquiries open for spring 2027 — the first teams onto the land.",
      },
    ],
  }),
});

const facts = [
  { k: "Group", v: "6–30 people" },
  { k: "Length", v: "2–5 days" },
  { k: "From Calgary", v: "90 minutes" },
  { k: "Season", v: "Spring 2027" },
];

function SpringPage() {
  return (
    <main className="bg-coal text-fossil">
      <header className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between bg-coal/90 px-4 py-[1.1rem] backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2.5 text-fossil">
          <img
            src="/logo.svg"
            alt=""
            width={22}
            height={22}
            className="size-6 shrink-0 brightness-0 invert opacity-90"
          />
          <span className="font-display text-[1.05rem] font-black uppercase leading-none tracking-[0.16em]">
            Unearth<span className="text-ember">self</span>
          </span>
        </Link>
        <a
          href="#enquire"
          className="inline-flex rounded-[2px] bg-ember px-4 py-2 text-sm font-semibold text-white"
        >
          Enquire
        </a>
      </header>

      <section className="relative flex min-h-[100dvh] items-end overflow-hidden">
        <img
          src="/images/exp-hoodoos.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_65%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/55 to-coal/15" />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Launch · Spring 2027 · first teams
          </p>
          <h1 className="font-display mb-5 text-[clamp(2.6rem,8vw,5.4rem)] leading-[0.9] text-balance uppercase">
            Canada’s newest
            <br />
            corporate expedition.
          </h1>
          <p className="mb-8 max-w-[42ch] text-lg text-pretty text-fossil/85">
            Not a hotel ballroom with a hike attached. A 2–5 day Badlands Bootcamp in Drumheller —
            and we are taking enquiries for the first teams onto the land this spring.
          </p>
          <a
            href="#enquire"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Hold a spring date
          </a>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The teaser</p>
          <h2 className="font-display mb-6 text-4xl text-balance uppercase">
            A new kind of corporate retreat. The Badlands. Your team among the first.
          </h2>
          <p className="mb-4 text-lg text-pretty text-fossil/80">
            Canada does not have this yet: an expedition built for six to thirty people, ninety
            minutes from Calgary, with a house for heat and cold when the day is done. Spring 2027
            is the first season we will run it for teams.
          </p>
          <p className="text-lg text-pretty text-fossil/80">
            If you want your people somewhere the job title will not follow — and you want to be on
            the land before the calendar fills — this is the page. Enquiries now. Dates and a figure
            come back by email.
          </p>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 md:grid-cols-4">
          {facts.map((f) => (
            <div key={f.k} className="border-t border-fossil/15 pt-4">
              <p className="mb-1 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">{f.k}</p>
              <p className="font-display text-2xl uppercase">{f.v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">What they walk into</p>
          <h2 className="font-display mb-12 text-4xl uppercase">Land. Sequence. Recovery.</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <article>
              <div className="mb-4 aspect-[4/3] overflow-hidden bg-shale">
                <img src="/images/exp-canyon.jpg" alt="" className="h-full w-full object-cover" />
              </div>
              <p className="text-[0.68rem] tracking-[0.18em] text-sandstone uppercase">The expedition</p>
              <h3 className="font-display mt-1 text-3xl uppercase">Badlands Bootcamp</h3>
              <p className="mt-2 text-fossil/70">
                Play, Adaptability, Connection, Experience — practised on the ground, then carried.
                Weather, route, each other. Not a deck outdoors.
              </p>
            </article>
            <article>
              <div className="mb-4 aspect-[4/3] overflow-hidden bg-shale">
                <img
                  src="/images/haven/elowen/elowen-01.jpg"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-[0.68rem] tracking-[0.18em] text-sandstone uppercase">Sleep</p>
              <h3 className="font-display mt-1 text-3xl uppercase">Haven</h3>
              <p className="mt-2 text-fossil/70">
                Four suites on the block. Canalta when the group is larger. You wake in town, you
                work in the canyon.
              </p>
            </article>
            <article>
              <div className="mb-4 aspect-[4/3] overflow-hidden bg-shale">
                <img src="/images/basecamp/lounge.jpg" alt="" className="h-full w-full object-cover" />
              </div>
              <p className="text-[0.68rem] tracking-[0.18em] text-sandstone uppercase">After the land</p>
              <h3 className="font-display mt-1 text-3xl uppercase">Basecamp</h3>
              <p className="mt-2 text-fossil/70">
                Heat, cold and hands. A close that is quiet on purpose — so Monday is not a reset to
                silence.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Who this is for</p>
          <h2 className="font-display mb-6 text-4xl text-balance uppercase">
            The person who sends the invite.
          </h2>
          <p className="mb-4 text-pretty text-fossil/75">
            Calgary and Edmonton leadership groups. Founders, senior teams, crews that collaborate
            on paper and stall in the room. Close enough to leave in the morning and be on the land
            by lunch.
          </p>
          <p className="text-pretty text-fossil/75">
            If you want a tasting menu, a speaker and a branded notebook, this is the wrong page.
            This costs real money. It is not a conference rate. It is the first season of something
            Canada has not had.
          </p>
        </div>
      </section>

      <Enquire />

      <footer className="border-t border-fossil/10 px-6 py-10 text-sm text-fossil/55">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>Unearth Self · Drumheller, Alberta</p>
          <p>
            <a href="mailto:hello@unearthself.xyz" className="hover:text-fossil">
              hello@unearthself.xyz
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-1.5 block text-xs font-semibold tracking-widest text-shale uppercase">
      {children}
    </span>
  );
}

function Enquire() {
  const search = Route.useSearch();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    const payload = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      company: String(data.get("company") || ""),
      role: String(data.get("role") || ""),
      headcount: String(data.get("headcount") || ""),
      window: String(data.get("window") || ""),
      notes: String(data.get("notes") || ""),
      honey: String(data.get("website") || ""),
      utmSource: search.utm_source,
      utmMedium: search.utm_medium,
      utmCampaign: search.utm_campaign,
    };
    try {
      const mailed = await mailSpringEnquiry(payload);
      try {
        ingestSpringEnquiry(payload);
      } catch {
        /* desk book is client-only */
      }
      try {
        await submitSpringEnquiry({ data: payload });
      } catch {
        /* webhook is optional until D04 */
      }
      if (!mailed) {
        setStatus("error");
        return;
      }
      setStatus("done");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="enquire" className="bg-fossil px-6 py-20 text-coal">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_1.1fr] md:items-start">
        <div>
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-shale uppercase">Spring 2027</p>
          <h2 className="font-display mb-4 text-4xl uppercase">Hold a date for the first teams.</h2>
          <p className="max-w-[42ch] text-pretty text-coal/70">
            Tell us who is coming and which month you can travel. We write back with availability
            and a figure. No deposit from this page — this is the enquiry, not a checkout.
          </p>
        </div>

        {status === "done" ? (
          <div className="border border-coal/15 bg-white p-8">
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-shale uppercase">In the book</p>
            <h3 className="font-display mb-3 text-3xl uppercase">We’ll write back.</h3>
            <p className="max-w-[40ch] text-coal/70">
              You are in for spring. If the dates work we will say so. If they do not, we will offer
              the next window that does.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4 border border-coal/15 bg-white p-6 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <FieldLabel>Name</FieldLabel>
                <Input name="name" required autoComplete="name" />
              </label>
              <label>
                <FieldLabel>Work email</FieldLabel>
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <FieldLabel>Company</FieldLabel>
                <Input name="company" required autoComplete="organization" />
              </label>
              <label>
                <FieldLabel>Role</FieldLabel>
                <Input name="role" autoComplete="organization-title" placeholder="Optional" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <FieldLabel>Headcount</FieldLabel>
                <NativeSelect name="headcount" required defaultValue="">
                  <option value="" disabled>
                    How many
                  </option>
                  <option value="6–10">6–10</option>
                  <option value="11–16">11–16</option>
                  <option value="17–24">17–24</option>
                  <option value="25–30">25–30</option>
                </NativeSelect>
              </label>
              <label>
                <FieldLabel>Window</FieldLabel>
                <NativeSelect name="window" required defaultValue="">
                  <option value="" disabled>
                    Prefer
                  </option>
                  <option value="March 2027">March 2027</option>
                  <option value="April 2027">April 2027</option>
                  <option value="May 2027">May 2027</option>
                  <option value="June 2027">June 2027</option>
                  <option value="Flexible">Flexible</option>
                </NativeSelect>
              </label>
            </div>
            <label>
              <FieldLabel>Anything we should know</FieldLabel>
              <textarea
                name="notes"
                rows={4}
                className="w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-sm text-coal outline-none focus:border-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
              />
            </label>
            <div className="sr-only" aria-hidden="true">
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            {status === "error" ? (
              <p className="text-sm text-ember">
                That did not send. Try again, or write{" "}
                <a className="underline" href="mailto:hello@unearthself.xyz">
                  hello@unearthself.xyz
                </a>
                .
              </p>
            ) : null}
            <Button type="submit" disabled={status === "sending"} className="mt-2 w-full md:w-auto">
              {status === "sending" ? "Sending…" : "Send enquiry"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
