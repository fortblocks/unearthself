import { createFileRoute } from "@tanstack/react-router";
import { AudiencePage } from "@/components/site/AudiencePage";

export const Route = createFileRoute("/for/friends")({
  component: FriendsLander,
  head: () => ({
    meta: [
      { title: "Badlands Bootcamp for friends - Unearth Self" },
      {
        name: "description",
        content:
          "Friends who want the outdoors together. A 2 to 5 day expedition for groups of 6 to 30, ninety minutes from Calgary.",
      },
    ],
  }),
});

function FriendsLander() {
  return (
    <AudiencePage
      word="Friends"
      eyebrow="The outdoors, together"
      lede="Friends who want the outdoors together. Not a race. Not a spa weekend. Not a classroom."
      heroImage="/images/hero-badlands-dusk.jpg"
      reasons={[
        {
          title: "Out of the car, onto the land.",
          body: "Arrive, drop what can be dropped, start before anyone has the right answer.",
          image: "/images/found/walk.jpg",
        },
        {
          title: "Most of it happens away from the screen.",
          body: "Trail Quest is a quest companion, not a wellness dashboard. Each Rune is revealed after the encounter, not before. No guest-facing AI coach. If it fights the canyon, paper wins.",
          image: "/images/exp-hoodoos.jpg",
        },
        {
          title: "A close that is quiet on purpose.",
          body: "Name what you will carry. Eat. Sleep at Haven, four suites on the block, with Canalta overflow. Heat, cold and hands at Basecamp.",
          image: "/images/haven/elowen/elowen-01.jpg",
        },
      ]}
      quote="The town is small. The land is not."
      quoteLabel="Ninety minutes from Calgary"
      closingHeading="6 to 30 people. Two to five days."
      closingLine="Tell us who is coming and when you can travel."
    />
  );
}
