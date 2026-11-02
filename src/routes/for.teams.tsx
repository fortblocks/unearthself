import { createFileRoute } from "@tanstack/react-router";
import { AudiencePage } from "@/components/site/AudiencePage";

export const Route = createFileRoute("/for/teams")({
  component: TeamsLander,
  head: () => ({
    meta: [
      { title: "Badlands Bootcamp for teams - Unearth Self" },
      {
        name: "description",
        content:
          "A 2 to 5 day expedition in the Canadian Badlands for groups of 6 to 30. Ninety minutes from Calgary.",
      },
    ],
  }),
});

function TeamsLander() {
  return (
    <AudiencePage
      word="Teams"
      eyebrow="For the person who sends the invite"
      lede="Take the team somewhere the job title won’t follow: six to thirty people, two to five days, ninety minutes from Calgary."
      introLabel="For corporate teams"
      introHeading="Not a hotel with a hike."
      intro={[
        "Badlands Bootcamp for teams is a two-to-five-day expedition for six to thirty people from the same company: founders, senior teams and leadership groups who need more than a change of hotel. It sits close enough that Calgary and Edmonton can leave in the morning and be on the land by lunch.",
        "The days are spent on the land, working through a sequence the group can keep using on Monday, and the recovery afterwards is genuinely quiet. It is not therapy, and it is not a circle that never ends.",
      ]}
      heroImage="/images/exp-hoodoos.jpg"
      reasons={[
        {
          title: "Most offsites change the scenery.",
          body: "Almost none change the team. The usual pattern is a rented room, a facilitator with a deck and a dinner that is pleasant and forgettable. Out here the land is older than the company and entirely indifferent to the org chart.",
          image: "/images/bootcamp-crew.jpg",
        },
        {
          title: "Honesty under pressure.",
          body: "You see how people decide when the script runs out. Play, Adaptability, Connection and Experience are each revealed, practised on the ground and then carried home.",
          image: "/images/audience/teams-map-huddle.jpg",
          alt: "A team huddled around a paper map on a sandstone ledge above the Badlands",
        },
        {
          title: "A way to keep talking on Monday.",
          body: "Short, structured time after the land gives the group room to say what actually happened, and a simple language for what showed up means Monday is not a reset to silence.",
          image: "/images/basecamp/lounge.jpg",
        },
      ]}
      quote="Arrive as a roster. Leave as a crew."
      quoteLabel="A typical three days"
      closingHeading="6 to 30 people. Two to five days. Drumheller."
      closingLine="Tell us who is coming and when you can travel."
    />
  );
}
