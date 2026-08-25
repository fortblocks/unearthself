import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/shop")({ component: Page });

function Page() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-32 pb-24">
      <h1 className="font-display mb-6 text-[clamp(2.5rem,6vw,4rem)]">Shop</h1>
      <p className="text-lg text-shale">
        Merchandise, runes, and objects that carry the brand language. Programme bookings live in the
        Retreat Builder.
      </p>
    </section>
  );
}
