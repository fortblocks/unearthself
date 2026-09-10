import { HAVEN_PHOTOS } from "./havenPhotos";

export type RoomSlug = "elowen" | "hidden-hollow" | "river-blossom" | "water-mark";

export type Room = {
  slug: RoomSlug;
  name: string;
  tagline: string;
  story: string;
  sleeps: number;
  bedrooms: string;
  baths: string;
  beds: string;
  size?: string;
  floor?: string;
  accessible?: boolean;
  extras: string[];
  images: string[];
};

export const ROOMS: Room[] = [
  {
    slug: "elowen",
    name: "Elowen",
    tagline: "Second floor. A high king, a double underneath, two bathrooms.",
    story:
      "Elowen is the high bed on the second floor. Nine hundred square feet. A king carriage bed you climb into on small steps, and a full double that pulls out from underneath when a fifth person arrives. The ensuite is a four-piece with a jetted tub and a walk-in closet. Off the living room, a three-piece with a double shower. Built-in entertainment in both rooms. Kitchen, stacked laundry, fireplace. Take it when the rest of the house is too small.",
    sleeps: 5,
    bedrooms: "1 bedroom",
    baths: "2 bathrooms",
    beds: "King carriage + double pull-out",
    size: "900 sq ft",
    floor: "Second floor",
    extras: [
      "King carriage bed with steps",
      "Double bed that pulls out underneath",
      "Four-piece ensuite with jetted tub",
      "Walk-in closet",
      "Three-piece bath with double shower",
      "Built-in entertainment in both rooms",
      "Stacked washer and dryer",
    ],
    images: [...HAVEN_PHOTOS.elowen],
  },
  {
    slug: "hidden-hollow",
    name: "Hidden Hollow",
    tagline: "Main floor. Queen, king trundle, no stairs.",
    story:
      "Hidden Hollow is the ground-floor key. Concrete counters, a bay window next to the fire, a four-piece bath with custom tile. Queen in the bedroom. In the living room, a king trundle. Stacking washer and dryer. If you need a stay without stairs, this is the one.",
    sleeps: 4,
    bedrooms: "1 bedroom",
    baths: "1 bathroom",
    beds: "Queen + king trundle",
    size: "538 sq ft",
    floor: "Main floor",
    accessible: true,
    extras: [
      "No stairs. Wheelchair accessible.",
      "Concrete kitchen counters",
      "Bay window by the fireplace",
      "Four-piece bath, custom tile",
      "King trundle in the living room",
      "Stacking washer and dryer",
    ],
    images: [...HAVEN_PHOTOS["hidden-hollow"]],
  },
  {
    slug: "river-blossom",
    name: "River Blossom",
    tagline: "Two bedrooms, a balcony, a short flight of steps.",
    story:
      "River Blossom is the split-level on the second floor, about eleven hundred square feet. Kitchen, dining, living and the master sit on the main level of the suite. The second bedroom is a few steps up, with a small office on the way. The master has a balcony, two closets, a jetted tub and an ensuite. Glass block in the bath and on the stair. Two doors you can close.",
    sleeps: 4,
    bedrooms: "2 bedrooms",
    baths: "2 bathrooms",
    beds: "Two bedrooms (master + second up a short flight)",
    size: "1,100 sq ft",
    floor: "Second floor",
    extras: [
      "Split-level: second bedroom up a short flight",
      "Master balcony",
      "Jetted tub and ensuite",
      "Small office",
      "Glass block in the bath and stair",
      "Living, dining, and fireplace",
    ],
    images: [...HAVEN_PHOTOS["river-blossom"]],
  },
  {
    slug: "water-mark",
    name: "Water Mark",
    tagline: "Main floor. King, a Murphy, a room you will not find on the first look.",
    story:
      "Water Mark is eleven hundred square feet on the main floor. One bedroom with a half-bath ensuite and a walk-in closet. The second bath is a four-piece with a jetted tub. King in the bedroom, a custom wood Murphy for the second sleep, a cot if you need it. Large laundry, storage in several places, a double closet by the door, and a small hidden room for anything you would rather not leave on a chair. Fireplace. The walk toward the valley starts here.",
    sleeps: 4,
    bedrooms: "1 bedroom",
    baths: "1.5 bathrooms",
    beds: "King + queen Murphy + cot if needed",
    size: "1,100 sq ft",
    floor: "Main floor",
    extras: [
      "Custom Murphy bed",
      "Hidden storage room",
      "Half-bath ensuite and walk-in closet",
      "Four-piece bath with jetted tub",
      "Large laundry",
      "Cot available",
    ],
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

export const HAVEN_PLACE =
  "Downtown Drumheller. Restaurants and shops within a block. A playground and open green on the same stretch. The Brew House two blocks over. Basecamp is next door when you want heat or a table.";

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
