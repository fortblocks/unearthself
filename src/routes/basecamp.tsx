import { createFileRoute } from "@tanstack/react-router";
import { TreatmentBook } from "@/components/basecamp/TreatmentBook";
import { HERO_SENTENCE } from "@/data/basecampCopy";

export const Route = createFileRoute("/basecamp")({
  component: BasecampPage,
  head: () => ({
    meta: [
      { title: "Basecamp - Unearth Self" },
      {
        name: "description",
        content: HERO_SENTENCE,
      },
    ],
  }),
});

function BasecampPage() {
  return (
    <main className="bg-coal text-fossil">
      <TreatmentBook />
    </main>
  );
}
