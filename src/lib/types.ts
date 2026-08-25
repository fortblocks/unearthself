export type ActivityCategory =
  | "recovery"
  | "outdoor"
  | "mind-body"
  | "team"
  | "cultural"
  | "seasonal";

export type Season = "winter" | "summer" | "year-round";

export type TimeBlock = "morning" | "afternoon" | "evening";

export type Intensity = "moderate" | "hardcore" | "extreme";

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  durationMin: number;
  durationOptions?: number[];
  season: Season;
  maxCapacity?: number;
  description: string;
  vibe: string;
  fitnessLevel: "any" | "moderate" | "high";
  indoor: boolean;
  whatToBring?: string[];
  tags: string[];
}

export interface PlacedActivity {
  instanceId: string;
  activityId: string;
  durationMin: number;
  locked: boolean;
}

export interface DayPlan {
  id: string;
  label: string;
  blocks: Record<TimeBlock, PlacedActivity[]>;
}

export interface RetreatState {
  dayCount: number;
  days: DayPlan[];
  season: Season | "auto";
  intensityPreset: Intensity | null;
  groupSize: number;
  title: string;
}

export interface EnquiryPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  groupSize: number;
  preferredDates: string;
  notes?: string;
  itinerary: RetreatState;
}

export const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; color: string; bg: string; border: string }
> = {
  recovery: {
    label: "Recovery & Wellness",
    color: "#C99A4A",
    bg: "rgba(201, 154, 74, 0.12)",
    border: "rgba(201, 154, 74, 0.35)",
  },
  outdoor: {
    label: "Outdoor Adventure",
    color: "#F2684C",
    bg: "rgba(242, 104, 76, 0.12)",
    border: "rgba(242, 104, 76, 0.35)",
  },
  "mind-body": {
    label: "Guided Mind-Body",
    color: "#C99A4A",
    bg: "rgba(201, 154, 74, 0.12)",
    border: "rgba(201, 154, 74, 0.35)",
  },
  team: {
    label: "Team Challenges",
    color: "#423530",
    bg: "rgba(66, 53, 48, 0.12)",
    border: "rgba(66, 53, 48, 0.35)",
  },
  cultural: {
    label: "Local Cultural / Events",
    color: "#C99A4A",
    bg: "rgba(201, 154, 74, 0.12)",
    border: "rgba(201, 154, 74, 0.35)",
  },
  seasonal: {
    label: "Seasonal Specials",
    color: "#FC7D6D",
    bg: "rgba(252, 125, 109, 0.12)",
    border: "rgba(252, 125, 109, 0.35)",
  },
};

export const BLOCK_META: Record<
  TimeBlock,
  { label: string; capacityMin: number; window: string }
> = {
  morning: { label: "Morning", capacityMin: 240, window: "08:00 – 12:00" },
  afternoon: { label: "Afternoon", capacityMin: 300, window: "12:00 – 17:00" },
  evening: { label: "Evening", capacityMin: 240, window: "17:00 – 21:00" },
};

export const TRANSFER_BUFFER_MIN = 20;
export const MIN_DAYS = 2;
export const MAX_DAYS = 5;
export const DEFAULT_DAYS = 3;
