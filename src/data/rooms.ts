export type RoomSlug = "elowen" | "hidden-hollow" | "river-blossom" | "water-mark";

export type Room = {
  slug: RoomSlug;
  name: string;
  tagline: string;
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
    tagline: "The larger suite — space for a small family or a close group.",
    sleeps: 5,
    bedrooms: "Flexible suite",
    images: ["/images/haven/elowen-1.jpg", "/images/haven/elowen-2.jpg"],
  },
  {
    slug: "hidden-hollow",
    name: "Hidden Hollow",
    tagline: "A one-bedroom on the main floor. Queen bed, sofa bed, 538 square feet.",
    sleeps: 4,
    bedrooms: "1 bedroom",
    size: "538 sq ft",
    floor: "Main floor",
    images: ["/images/haven/hidden-hollow-1.jpg", "/images/haven/hidden-hollow-2.jpg"],
  },
  {
    slug: "river-blossom",
    name: "River Blossom",
    tagline: "Two bedrooms and a terrace — for longer rest, or travelling together.",
    sleeps: 4,
    bedrooms: "2 bedrooms",
    images: ["/images/haven/river-blossom-1.jpg", "/images/haven/river-blossom-2.jpg"],
  },
  {
    slug: "water-mark",
    name: "Water Mark",
    tagline: "A spacious one-bedroom. Quiet, self-contained, close to the river valley.",
    sleeps: 4,
    bedrooms: "1 bedroom",
    images: ["/images/haven/water-mark-1.jpg", "/images/haven/water-mark-2.jpg"],
  },
];

export const HAVEN_SHARED = [
  "Full kitchen",
  "Fireplace",
  "Air conditioning",
  "Wi-Fi",
  "On-site parking",
  "Washer & dryer",
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
