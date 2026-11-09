import { createFileRoute, notFound } from "@tanstack/react-router";
import { TreatmentDetail } from "@/components/basecamp/TreatmentDetail";
import { cad, treatmentById } from "@/data/treatments";

export const Route = createFileRoute("/basecamp/$slug")({
  loader: ({ params }) => {
    const treatment = treatmentById(params.slug);
    if (!treatment) throw notFound();
    return { treatment };
  },
  head: ({ loaderData }) => {
    const treatment = loaderData?.treatment;
    if (!treatment) return { meta: [{ title: "Basecamp - Unearth Self" }] };
    return {
      meta: [
        { title: `${treatment.name} - Basecamp - Unearth Self` },
        {
          name: "description",
          content: `${treatment.name}. ${treatment.mins}. ${cad(treatment.price)}. ${treatment.line}`,
        },
      ],
    };
  },
  component: TreatmentPage,
});

function TreatmentPage() {
  const { treatment } = Route.useLoaderData();
  return <TreatmentDetail treatment={treatment} />;
}
