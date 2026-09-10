import { nightsBetween, type RoomSlug } from "./rooms";

/** Direct BAR from the working model Haven BAR tab. Not the $300 package blend. */
export type SeasonId = "winter" | "shoulder" | "summer";

export type SeasonRates = {
  night: number;
  weekend: number;
  month: number;
};

export const SEASONS: { id: SeasonId; label: string; short: string }[] = [
  { id: "winter", label: "November–February", short: "Nov–Feb" },
  { id: "shoulder", label: "March–May", short: "Mar–May" },
  { id: "summer", label: "June–September", short: "Jun–Sep" },
];

export const HAVEN_RATES: Record<
  RoomSlug,
  { clean: number } & Record<SeasonId, SeasonRates>
> = {
  "hidden-hollow": {
    clean: 65,
    winter: { night: 165, weekend: 180, month: 2500 },
    shoulder: { night: 175, weekend: 195, month: 2400 },
    summer: { night: 195, weekend: 215, month: 2700 },
  },
  elowen: {
    clean: 65,
    winter: { night: 199, weekend: 245, month: 3000 },
    shoulder: { night: 205, weekend: 230, month: 3000 },
    summer: { night: 230, weekend: 265, month: 3400 },
  },
  "water-mark": {
    clean: 65,
    winter: { night: 225, weekend: 250, month: 3400 },
    shoulder: { night: 255, weekend: 275, month: 3800 },
    summer: { night: 295, weekend: 350, month: 4200 },
  },
  "river-blossom": {
    clean: 65,
    winter: { night: 225, weekend: 250, month: 3600 },
    shoulder: { night: 250, weekend: 275, month: 3750 },
    summer: { night: 295, weekend: 350, month: 4200 },
  },
};

/** House sheet extras. Not on the working-model BAR tab. */
export const HAVEN_EXTRAS = {
  dog: 50,
  extraAdult: 30,
  extraChild: 20,
} as const;

export const HAVEN_RULES = [
  "Check-in from 16:00. Check-out by 11:00.",
  "Direct bookings: full refund 14 days out, half at 7, none inside 7.",
  "Cleaning is charged once per stay.",
  "Weekend rate is Friday and Saturday night.",
  "A dog is $50. Extra adults $30 a night, children under 13 $20.",
] as const;

export function fromNight(slug: RoomSlug): number {
  return HAVEN_RATES[slug].winter.night;
}

export function seasonOf(isoDate: string): SeasonId {
  const month = new Date(`${isoDate}T12:00:00`).getMonth() + 1;
  if (month === 11 || month === 12 || month === 1 || month === 2) return "winter";
  if (month >= 6 && month <= 9) return "summer";
  return "shoulder";
}

export function isWeekendNight(isoDate: string): boolean {
  const day = new Date(`${isoDate}T12:00:00`).getDay();
  return day === 5 || day === 6;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export type StayQuote = {
  nights: number;
  subtotal: number;
  clean: number;
  total: number;
  mixed: boolean;
};

export function quoteStay(slug: RoomSlug, checkIn: string, checkOut: string): StayQuote | null {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return null;
  const rates = HAVEN_RATES[slug];
  let subtotal = 0;
  const seen = new Set<SeasonId>();
  for (let i = 0; i < nights; i++) {
    const iso = addDays(checkIn, i);
    const season = seasonOf(iso);
    seen.add(season);
    const band = rates[season];
    subtotal += isWeekendNight(iso) ? band.weekend : band.night;
  }
  return {
    nights,
    subtotal,
    clean: rates.clean,
    total: subtotal + rates.clean,
    mixed: seen.size > 1,
  };
}
