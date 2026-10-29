import { createFileRoute } from "@tanstack/react-router";
import { AudiencePage } from "@/components/site/AudiencePage";

export const Route = createFileRoute("/for/crews")({
  component: CrewsLander,
  head: () => ({
    meta: [
      { title: "Badlands Bootcamp for crews - Unearth Self" },
      {
        name: "description",
        content:
          "Firefighters, police services, coaching staff. A 2 to 5 day expedition for groups of 6 to 30, ninety minutes from Calgary.",
      },
    ],
  }),
});

function CrewsLander() {
  return (
    <AudiencePage
      word="Crews"
      eyebrow="Groups who already work as one"
      lede="Firefighters, police services, coaching staff. The people who need to be useful to each other when the plan dies."
      heroImage="/images/exp-canyon.jpg"
      reasons={[
        {
          title: "The plan will not survive.",
          body: "Weather, route, each other. This is where the useful friction lives.",
          image: "/images/found/trail.jpg",
        },
        {
          title: "No one travels alone.",
          body: "The team travels without a facilitator in the canyon. Trail Quest guides. The Field Recorder reads discoveries aloud. They do not lead the team or decide for it.",
          image: "/images/exp-rolling.jpg",
        },
        {
          title: "Heat, cold and hands.",
          body: "Recovery at Basecamp, the house next door. Nights at Haven, four suites on the block, with Canalta when the group is larger.",
          image: "/images/basecamp/lounge.jpg",
        },
      ]}
      quote="The point is not who is fittest."
      quoteLabel="Badlands Bootcamp"
      closingHeading="6 to 30 people. Two to five days."
      closingLine="Ninety minutes from Calgary. The town is small. The land is not."
    />
  );
}
