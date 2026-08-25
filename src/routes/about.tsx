import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({ component: Page });

function Page() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-32 pb-24">
      <h1 className="font-display mb-6 text-[clamp(2.5rem,6vw,4rem)]">About</h1>
      <p className="text-lg text-shale">
        Unearthself is rooted in Drumheller, Alberta — the Canadian Badlands — and holds Basecamp, Badlands
        Bootcamp and Haven as one ecosystem. The long-term vision is a recognised modality with centres
        worldwide.
      </p>
    </section>
  );
}
