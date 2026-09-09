import { createFileRoute } from "@tanstack/react-router";
import { TreatmentBook } from "@/components/basecamp/TreatmentBook";

export const Route = createFileRoute("/basecamp")({
  component: BasecampPage,
  head: () => ({
    meta: [
      { title: "Basecamp - Unearth Self" },
      {
        name: "description",
        content:
          "Treatments, heat and cold, and the house next to Haven. Day guests welcome. Drumheller.",
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
