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
      intro={[
        "Badlands Bootcamp works for groups of friends too — six to thirty people who want the outdoors together.",
        "Not a race. Not a spa weekend. Not a classroom. Days on the land, nights at Haven or Canalta, and recovery next door at Basecamp. Ninety minutes from Calgary. The town is small. The land is not.",
      ]}
      heroImage="/images/hero-badlands-dusk.jpg"
      reasons={[
        {
          title: "Start before anyone has the right answer.",
          body: "Out of the car, onto the land. Arrive, drop what can be dropped. Play comes first in the sequence, and the point is not who is fittest.",
          image: "/images/found/walk.jpg",
        },
        {
          title: "A shared story, not a tote bag.",
          body: "Each Rune is revealed after the encounter, not before. Most of it happens away from the screen. Private notes stay on your device. No guest-facing AI coach.",
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
