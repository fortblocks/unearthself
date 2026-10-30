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
      intro={[
        "Firefighters, police services, coaching staff. Groups who already work as one, and need to be useful to each other when the plan dies.",
        "Six to thirty people. Two to five days. Ninety minutes from Calgary. The point is not who is fittest. The point is a group that can see its own patterns and choose again. Pass on sharing is always available — notice, don’t excavate.",
      ]}
      heroImage="/images/exp-canyon.jpg"
      reasons={[
        {
          title: "The plan will not survive.",
          body: "Weather, route, each other. This is where the useful friction lives — for a crew that already knows how to work when things change.",
          image: "/images/found/trail.jpg",
        },
        {
          title: "Nobody is elected leader.",
          body: "In the canyon the team travels without a facilitator. Trail Quest guides. The Field Recorder reads discoveries aloud and warns when a station is coming, but does not lead the team or decide for it. About every 20 minutes the team picks a new one.",
          image: "/images/exp-rolling.jpg",
        },
        {
          title: "No one travels alone.",
          body: "Do not run on uneven ground. Failure Bow is in play for mistakes, not for injuries. When the day is done, Basecamp for heat, cold and hands.",
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
