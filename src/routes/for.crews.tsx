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
      lede="Firefighters, police services and coaching staff: the people who need to be useful to each other when the plan dies."
      introLabel="For crews"
      introHeading="Groups who already work as one."
      intro={[
        "Firefighters, police services and coaching staff already know how to work as one. What matters is staying useful to each other when the plan dies.",
        "Badlands Bootcamp brings six to thirty people onto the land for two to five days, ninety minutes from Calgary. The point is not who is fittest but a group that can see its own patterns and choose again, and passing on sharing is always available, because the rule here is notice, don’t excavate.",
      ]}
      heroImage="/images/exp-canyon.jpg"
      reasons={[
        {
          title: "The plan will not survive.",
          body: "Weather, route and each other all have a say, and that is where the useful friction lives for a crew that already knows how to work when things change.",
          image: "/images/work/horseshoe.jpg",
          alt: "Four walkers heading into Horseshoe Canyon between banded slopes",
        },
        {
          title: "Nobody is elected leader.",
          body: "In the canyon the team travels without a facilitator, with Trail Quest as the guide. The Field Recorder reads discoveries aloud and warns when a station is coming, but does not lead the team or decide for it, and about every twenty minutes the team picks a new one.",
          image: "/images/exp-rolling.jpg",
        },
        {
          title: "No one travels alone.",
          body: "Nobody runs on uneven ground, and the Failure Bow is there for mistakes, not for injuries. When the day is done, Basecamp is waiting next door with heat, cold and hands.",
          image: "/images/basecamp/lounge.jpg",
        },
      ]}
      quote="The point is not who is fittest."
      quoteLabel="Badlands Bootcamp"
      closingHeading="6 to 30 people. Two to five days."
      closingLine="Ninety minutes from Calgary, the town is small and the land is not."
    />
  );
}
