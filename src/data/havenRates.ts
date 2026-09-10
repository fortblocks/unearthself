import { nightsBetween, type RoomSlug } from "./rooms";

/** Direct BAR from the house card (2026 Suite Pricing). Not the $300 package blend. */
export type SeasonId = "winter" | "spring" | "peak" | "fall";

export type SeasonRates = {
  night: number;
  weekend: number;
  month: number;
};

export const SEASONS: { id: SeasonId; label: string; short: string }[] = [
  { id: "winter", label: "November–February", short: "Nov–Feb" },
  { id: "spring", label: "March–19 June", short: "Mar–19 Jun" },
  { id: "peak", label: "20 June–6 September", short: "20 Jun–6 Sep" },
  { id: "fall", label: "7 September–October", short: "Sep–Oct" },
];

export const HAVEN_RATES: Record<
  RoomSlug,
  { clean: number } & Record<SeasonId, SeasonRates>
> = {
  "hidden-hollow": {
    clean: 65,
    winter: { night: 165, weekend: 180, month: 2500 },
    spring: { night: 175, weekend: 190, month: 2600 },
    peak: { night: 195, weekend: 210, month: 2700 },
    fall: { night: 175, weekend: 190, month: 2600 },
  },
  elowen: {
    clean: 65,
    winter: { night: 195, weekend: 245, month: 2800 },
    spring: { night: 205, weekend: 230, month: 3000 },
    peak: { night: 230, weekend: 265, month: 3400 },
    fall: { night: 215, weekend: 235, month: 3000 },
  },
  "water-mark": {
    clean: 85,
    winter: { night: 225, weekend: 275, month: 3600 },
    spring: { night: 250, weekend: 295, month: 3800 },
    peak: { night: 295, weekend: 350, month: 4200 },
    fall: { night: 255, weekend: 295, month: 3800 },
  },
  "river-blossom": {
    clean: 85,
    winter: { night: 225, weekend: 275, month: 3600 },
    spring: { night: 250, weekend: 295, month: 3800 },
    peak: { night: 295, weekend: 350, month: 4200 },
    fall: { night: 255, weekend: 295, month: 3800 },
  },
};

export const HAVEN_EXTRAS = {
  dog: 50,
  extraAdult: 30,
  extraChild: 20,
  monthlyClean: 250,
} as const;

export const HAVEN_RULES = [
  "Check-in from 16:00. Check-out by 11:00.",
  "Direct bookings: full refund 14 days out, half at 7, none inside 7.",
  "Cleaning is $65 (Hidden Hollow, Elowen) or $85 (River Blossom, Water Mark) per stay.",
  "Monthly stays: $250 cleaning a month instead of the per-stay fee.",
  "Weekend rate is Friday and Saturday night.",
  "A dog is $50. Extra adults $30 a night, children under 13 $20.",
] as const;

export function fromNight(slug: RoomSlug): number {
  return HAVEN_RATES[slug].winter.night;
}

/** Peak is 20 June–6 September. Spring ends 19 June. Fall starts 7 September. */
export function seasonOf(isoDate: string): SeasonId {
  const d = new Date(`${isoDate}T12:00:00`);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const md = month * 100 + day;
  if (month === 11 || month === 12 || month === 1 || month === 2) return "winter";
  if (md >= 620 && md <= 906) return "peak";
  if (month === 9 || month === 10) return "fall";
  return "spring";
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
  monthly: boolean;
};

export function quoteStay(slug: RoomSlug, checkIn: string, checkOut: string): StayQuote | null {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return null;
  const rates = HAVEN_RATES[slug];
  const seen = new Set<SeasonId>();
  let subtotal = 0;
  let monthHigh = 0;
  for (let i = 0; i < nights; i++) {
    const iso = addDays(checkIn, i);
    const season = seasonOf(iso);
    seen.add(season);
    const band = rates[season];
    subtotal += isWeekendNight(iso) ? band.weekend : band.night;
    monthHigh = Math.max(monthHigh, band.month);
  }
  const monthly = nights >= 28;
  const clean = monthly ? HAVEN_EXTRAS.monthlyClean : rates.clean;
  const room = monthly ? monthHigh : subtotal;
  return {
    nights,
    subtotal: room,
    clean,
    total: room + clean,
    mixed: seen.size > 1,
    monthly,
  };
}
