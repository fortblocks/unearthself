import type { Intensity, PlacedActivity, TimeBlock } from "@/lib/types";
import { nanoid } from "nanoid";

function place(activityId: string, durationMin: number): PlacedActivity {
  return {
    instanceId: nanoid(8),
    activityId,
    durationMin,
    locked: false,
  };
}

type SampleDay = Record<TimeBlock, PlacedActivity[]>;

export interface SampleItinerary {
  id: Intensity;
  name: string;
  tagline: string;
  description: string;
  days: SampleDay[];
}

export const SAMPLE_ITINERARIES: SampleItinerary[] = [
  {
    id: "moderate",
    name: "Moderate",
    tagline: "Balance the edge",
    description:
      "Adventure with room to breathe. Outdoor highlights paired with recovery so your team leaves charged — not crushed.",
    days: [
      {
        morning: [place("sunrise-hoodoo", 120)],
        afternoon: [place("disc-golf", 120), place("infrared-sauna", 40)],
        evening: [place("red-light-circle", 50)],
      },
      {
        morning: [place("improv", 90)],
        afternoon: [place("cold-plunge-steam", 45), place("nervous-system-reset", 55)],
        evening: [place("amphitheatre-sunset", 90)],
      },
      {
        morning: [place("fossil-hunting", 150)],
        afternoon: [place("massage-60", 60)],
        evening: [place("movie-block", 120)],
      },
    ],
  },
  {
    id: "hardcore",
    name: "Hardcore",
    tagline: "Earn the recovery",
    description:
      "Bigger efforts, tighter bonding. Team challenges and serious outdoor days with intentional recovery woven in.",
    days: [
      {
        morning: [place("orienteering", 150)],
        afternoon: [place("abseiling", 150)],
        evening: [place("breathwork-fire", 60)],
      },
      {
        morning: [place("horseshoe-canyon", 180)],
        afternoon: [place("cold-plunge-steam", 45), place("strength-circuit", 75)],
        evening: [place("rosebud-theatre", 150)],
      },
      {
        morning: [place("eleven-bridges", 210)],
        afternoon: [place("nervous-system-reset", 55), place("massage-60", 60)],
        evening: [place("red-light-circle", 50)],
      },
    ],
  },
  {
    id: "extreme",
    name: "Extreme",
    tagline: "Forged. Fully.",
    description:
      "Maximum Badlands. Overnight under the stars, cold challenges, long canyon days — this is the retreat people still talk about in five years.",
    days: [
      {
        morning: [place("sunrise-hoodoo", 120)],
        afternoon: [place("abseiling", 150)],
        evening: [place("ice-bath-circuit", 75)],
      },
      {
        morning: [place("raft-building", 180)],
        afternoon: [place("horseshoe-canyon", 180)],
        evening: [place("overnight-bivouac", 240)],
      },
      {
        morning: [place("strength-circuit", 75), place("cold-plunge-steam", 45)],
        afternoon: [place("orienteering", 150)],
        evening: [place("nervous-system-reset", 55)],
      },
    ],
  },
];
