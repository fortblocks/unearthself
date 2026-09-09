import { HAVEN_PHOTOS } from "./havenPhotos";

export type RoomSlug = "elowen" | "hidden-hollow" | "river-blossom" | "water-mark";

export type Room = {
  slug: RoomSlug;
  name: string;
  tagline: string;
  story: string;
  sleeps: number;
  bedrooms: string;
  size?: string;
  floor?: string;
  images: string[];
};

export const ROOMS: Room[] = [
  {
    slug: "elowen",
    name: "Elowen",
    tagline: "The largest key. Room for a small family or a tight crew.",
    story:
      "Elowen is the suite you take when the group will not fit anywhere else in the house. One generous room to gather, cook and sleep five. Fireplace, kitchen, the same quiet downtown street as the rest of Haven.",
    sleeps: 5,
    bedrooms: "1 bedroom",
    images: [...HAVEN_PHOTOS.elowen],
  },
  {
    slug: "hidden-hollow",
    name: "Hidden Hollow",
    tagline: "Main floor. Queen, sofa bed, 538 square feet.",
    story:
      "Hidden Hollow sits on the main floor of the heritage building. A one-bedroom with a sofa bed for two more. Best when you want the least stairs and a compact, self-contained stay.",
    sleeps: 4,
    bedrooms: "1 bedroom",
    size: "538 sq ft",
    floor: "Main floor",
    images: [...HAVEN_PHOTOS["hidden-hollow"]],
  },
  {
    slug: "river-blossom",
    name: "River Blossom",
    tagline: "Two bedrooms and a terrace. The family key.",
    story:
      "River Blossom is the two-bedroom suite, about 1,100 square feet, with a terrace. Take it when two rooms matter more than a view of each other. Cooking, fireplace, space to close a door.",
    sleeps: 4,
    bedrooms: "2 bedrooms",
    size: "About 1,100 sq ft",
    images: [...HAVEN_PHOTOS["river-blossom"]],
  },
  {
    slug: "water-mark",
    name: "Water Mark",
    tagline: "One bedroom, two baths, closest to the river valley.",
    story:
      "Water Mark is a spacious one-bedroom with a Murphy option and two bathrooms. The quietest walk toward the valley. Self-contained, good for two who want room, or four who travel light.",
    sleeps: 4,
    bedrooms: "1 bedroom",
    images: [...HAVEN_PHOTOS["water-mark"]],
  },
];

export const HAVEN_SHARED = [
  "Full kitchen",
  "Fireplace",
  "Air conditioning",
  "Wi-Fi",
  "On-site parking",
  "Washer and dryer",
] as const;

export const HAVEN_ADDRESS = "360 4 Street West, Drumheller, Alberta";

export function getRoom(slug: string | undefined): Room | undefined {
  return ROOMS.find((r) => r.slug === slug);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(`${checkIn}T12:00:00`);
  const b = new Date(`${checkOut}T12:00:00`);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}
