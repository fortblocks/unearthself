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
      heroImage="/images/exp-hoodoos.jpg"
      reasons={[
        {
          title: "Honesty under pressure.",
          body: "You see how people decide when the script runs out. Days on the land. The Badlands are older than the company and indifferent to the org chart.",
          image: "/images/bootcamp-crew.jpg",
        },
        {
          title: "A bond that is not performed.",
          body: "Shared work on real ground beats a trust exercise on carpet. Play, Adaptability, Connection and Experience — each Rune revealed, practised on the ground, then carried.",
          image: "/images/exp-canyon.jpg",
        },
        {
          title: "A way to keep talking.",
          body: "A simple language for what showed up — so Monday is not a reset to silence. Sleep at Haven, four suites on the block, or Canalta when the group is larger. Basecamp for heat, cold and hands when the day is done.",
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
