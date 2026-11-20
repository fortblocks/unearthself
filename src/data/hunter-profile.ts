/**
 * Ideal-customer profile for the Lead Hunter.
 * Edit this file to change who we look for. The search prompt reads it.
 * Profile points are capped at 50 when a card is scored, so the raw points below may add up to more.
 * Travel points are out of 10 and must stay above zero. Region weights are a soft priority, not a filter.
 */

export type HunterSignal = {
  id: string;
  label: string;
  /** What the search should look for on a public page. */
  search: string;
  /** A hit counts only when one of these strings is on the fetched page. */
  terms: string[];
  points: number;
};

export type HunterRegion = {
  id: string;
  label: string;
  /** Slot default. Finer priority is HUNTER_REGION_WEIGHTS. Never zero. */
  travel: number;
  /** Empty means any verified place is in scope. */
  placeTerms: string[];
};

export const HUNTER_SIGNALS: HunterSignal[] = [
  {
    id: "boundaries",
    label: "Pushes boundaries",
    search: "a company that says in public that it pushes boundaries or takes on hard work",
    terms: ["pushing boundaries", "push boundaries", "boundary-pushing", "bold bets"],
    points: 8,
  },
  {
    id: "distributed",
    label: "Distributed or high-performing team",
    search: "a distributed team, a remote team, or a team described as high-performing",
    terms: ["distributed team", "remote team", "high-performing", "high performing", "hybrid team"],
    points: 8,
  },
  {
    id: "purpose",
    label: "B Corp, sustainability, or purpose",
    search: "a public B Corp, sustainability, or purpose statement",
    terms: ["b corp", "b corporation", "certified b", "sustainability", "purpose-led", "purpose led"],
    points: 8,
  },
  {
    id: "outdoor",
    label: "Outdoor or adventure-adjacent",
    search: "an outdoor, adventure, or wilderness brand, or a company that talks about the outdoors",
    terms: ["outdoor", "adventure", "wilderness", "backcountry", "trail"],
    points: 8,
  },
  {
    id: "offsite",
    label: "Public offsite or culture programme",
    search: "a public offsite, away day, or culture programme",
    terms: ["offsite", "off-site", "away day", "culture programme", "culture program", "retreat", "company retreat", "team retreat", "incentive trip", "sales kickoff", "sales kick-off"],
    points: 6,
  },
  {
    id: "leadership",
    label: "Leadership development",
    search: "a stated leadership-development programme or budget",
    terms: ["leadership development", "leadership programme", "leadership program"],
    points: 6,
  },
  {
    id: "growth",
    label: "Growth or a new people leader",
    search: "recent growth, or a newly named leader of people or culture",
    terms: ["chief people", "head of people", "vp people", "head of culture", "people and culture"],
    points: 6,
  },
  {
    id: "big-tech",
    label: "Forward-thinking technology company",
    search: "a software company, a technology company, or a product engineering team",
    terms: ["software company", "technology company", "product engineering"],
    points: 8,
  },
  {
    id: "funding",
    label: "Recent funding or a growth round",
    search: "a company that has published a funding round",
    terms: ["series a", "series b", "series c", "raised funding", "funding round"],
    points: 6,
  },
  {
    id: "events-hiring",
    label: "Hiring for events, experience, or learning",
    search: "a public posting for employee experience, learning and development, or an events manager",
    terms: ["employee experience", "learning and development", "events manager"],
    points: 6,
  },
  {
    id: "travel-tieup",
    label: "Works with a travel or experience provider",
    search: "a company that names a travel or experience provider it already uses",
    terms: ["travel partner", "experience partner"],
    points: 6,
  },
];

/** Affordability hypotheses. Reviewed monthly. Not a filter and not a fixed rule. */
export const HUNTER_AFFORDABILITY_SIGNAL_IDS = ["big-tech", "funding", "events-hiring", "travel-tieup"] as const;

export const HUNTER_REGIONS: HunterRegion[] = [
  {
    id: "canada",
    label: "Canada",
    travel: 10,
    placeTerms: ["canada", "calgary", "edmonton", "alberta", "toronto", "vancouver", "ottawa", "montreal", "winnipeg"],
  },
  {
    id: "us",
    label: "United States",
    travel: 8,
    placeTerms: ["united states", "usa", "u.s."],
  },
  {
    id: "europe",
    label: "Europe",
    travel: 3,
    placeTerms: [
      "europe",
      "united kingdom",
      "england",
      "scotland",
      "wales",
      "ireland",
      "germany",
      "france",
      "netherlands",
      "sweden",
      "norway",
      "denmark",
      "spain",
      "italy",
      "portugal",
      "belgium",
      "switzerland",
      "austria",
      "finland",
      "poland",
    ],
  },
  {
    id: "asia-pacific",
    label: "Asia-Pacific",
    travel: 3,
    placeTerms: ["australia", "new zealand", "japan", "singapore", "korea", "india"],
  },
  {
    id: "latin-america",
    label: "Latin America",
    travel: 3,
    placeTerms: ["brazil", "mexico", "chile", "argentina", "colombia"],
  },
  {
    id: "anywhere",
    label: "anywhere",
    travel: 2,
    placeTerms: [],
  },
];

/**
 * Soft regional priority. Not a filter, and not fixed: review it each month.
 * Alberta and the rest of Canada come first, then Vancouver, then California and Washington.
 * Europe and Mexico share the same low weight and stay searchable.
 */
export const HUNTER_REGION_WEIGHTS = {
  fixed: false,
  reviewed: "monthly",
  alberta: 10,
  canada: 9,
  vancouver: 8,
  californiaWashington: 7,
  unitedStates: 6,
  europe: 3,
  mexico: 3,
  elsewhere: 2,
} as const;

export const HUNTER_STRATEGY_REVIEW = {
  fixed: false,
  cadence: "monthly",
  decidedOn: "19th November 2026",
  note: "Region weights and affordability signals are hypotheses. Review them each month. They are not filters. A forward-thinking technology company is a strong positive signal.",
  affordabilitySignalIds: HUNTER_AFFORDABILITY_SIGNAL_IDS,
  regionWeights: HUNTER_REGION_WEIGHTS,
} as const;

const ALBERTA_TERMS = ["calgary", "edmonton", "red deer", "alberta"];
const CANADA_TERMS = [
  "canada",
  "toronto",
  "ottawa",
  "montreal",
  "montréal",
  "winnipeg",
  "british columbia",
  "quebec",
  "québec",
  "manitoba",
  "saskatchewan",
  "nova scotia",
  "new brunswick",
];
const WEST_COAST_TERMS = ["california", "washington", "seattle", "san francisco", "los angeles", "silicon valley", "bay area"];

function regionTravel(regionId: string) {
  const region = HUNTER_REGIONS.find((item) => item.id === regionId);
  return Math.max(1, Math.min(10, region?.travel ?? HUNTER_REGION_WEIGHTS.elsewhere));
}

/** Place-based travel weight. The region id is only the fallback when the place names nothing finer. */
export function regionWeightForPlace(place: string, regionId: string) {
  const hay = place.toLowerCase();
  const has = (terms: readonly string[]) => terms.some((term) => hay.includes(term));
  if (has(ALBERTA_TERMS)) return HUNTER_REGION_WEIGHTS.alberta;
  if (hay.includes("vancouver")) return HUNTER_REGION_WEIGHTS.vancouver;
  if (has(CANADA_TERMS)) return HUNTER_REGION_WEIGHTS.canada;
  const district = hay.includes("washington, dc") || hay.includes("washington dc") || hay.includes("district of columbia");
  if (!district && has(WEST_COAST_TERMS)) return HUNTER_REGION_WEIGHTS.californiaWashington;
  if (!hay.includes("new mexico") && hay.includes("mexico")) return HUNTER_REGION_WEIGHTS.mexico;
  const europe = HUNTER_REGIONS.find((item) => item.id === "europe");
  if (europe && has(europe.placeTerms)) return HUNTER_REGION_WEIGHTS.europe;
  if (has(["united states", "u.s.", "usa"])) return HUNTER_REGION_WEIGHTS.unitedStates;
  return regionTravel(regionId);
}

/** Contact-ready cards filed per Edmonton day. Both runs count together. */
export const HUNTER_DAILY_CARD_TARGET = 48;

export const HUNTER_ROSTER = {
  name: "Hunter",
  job: "Two runs, one bot. Nightly local sweep at 4am Edmonton: Calgary, Edmonton, and Red Deer, any headcount, any industry. Always-on hunt every 30 minutes in working hours. Region weights are a soft priority, reviewed monthly. 48 contact-ready cards is a ceiling, not a target. Never sends.",
  trigger: "Nightly at 4am Edmonton, and every 30 minutes from 7am to 7pm Edmonton",
  owner: "christopher" as const,
  escalate: "A company that cannot be confirmed on a public page.",
  limits: [
    "Never sends",
    "Never invents a fact",
    "No new paid source without approval",
    "No daily call cap. The monthly dollar cap still stops both runs",
    "Pause and the kill switch stop both runs",
  ],
};
