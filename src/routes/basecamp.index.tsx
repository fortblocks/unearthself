import { createFileRoute } from "@tanstack/react-router";
import { TreatmentBook } from "@/components/basecamp/TreatmentBook";
import { PLACE_HEADLINE, PLACE_PARAGRAPHS } from "@/data/basecampCopy";

export const Route = createFileRoute("/basecamp/")({
  component: BasecampPage,
  head: () => ({
    meta: [
      { title: "Basecamp - Unearth Self" },
      {
        name: "description",
        content: `${PLACE_HEADLINE} ${PLACE_PARAGRAPHS[0]}`,
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
