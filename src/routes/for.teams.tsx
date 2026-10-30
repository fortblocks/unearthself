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
      lede="Take the team somewhere the job title won’t follow. Six to thirty people. Two to five days. Ninety minutes from Calgary."
      intro={[
        "Badlands Bootcamp for teams is a 2–5 day expedition for six to thirty people from the same company — founders, senior teams, leadership groups who need more than a change of hotel.",
        "Close enough that Calgary and Edmonton can leave in the morning and be on the land by lunch. Days on the land, a sequence the group can keep using on Monday, and recovery that is actually quiet. Not therapy. Not a circle that never ends.",
      ]}
      heroImage="/images/exp-hoodoos.jpg"
      reasons={[
        {
          title: "Most offsites change the scenery.",
          body: "Almost none change the team. A rented room, a facilitator with a deck, a dinner that is pleasant and forgettable. Here the land is older than the company and indifferent to the org chart.",
          image: "/images/bootcamp-crew.jpg",
        },
        {
          title: "Honesty under pressure.",
          body: "You see how people decide when the script runs out. Play, Adaptability, Connection and Experience — each Rune revealed, practised on the ground, then carried.",
          image: "/images/exp-canyon.jpg",
        },
        {
          title: "A way to keep talking on Monday.",
          body: "Short structured time after the land so the group can say what actually happened. A simple language for what showed up — so Monday is not a reset to silence.",
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
