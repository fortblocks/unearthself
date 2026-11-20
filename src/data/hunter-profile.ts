/**
 * Ideal-customer profile for the Lead Hunter.
 * Edit this file to change who we look for. The search prompt reads it.
 * Profile points are capped at 50 when a card is scored, so the raw points below may add up to more.
 * Travel points are out of 10 and must stay above zero.
 * Phase one searches and files Canada and the United States only. Canada is the majority of the search slots.
 * Travel weights still score a card. They are not a second country filter.
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
 * Phase one search share. Canada runs first and is the majority of each cycle.
 * 70 Canadian slots and 30 United States slots. The greatest common divisor keeps the cycle at 7 and 3.
 */
export const HUNTER_REGION_SPLIT = {
  canada: 70,
  us: 30,
} as const;

/** Countries Apollo may search, and the only countries Hunter may file. */
export const HUNTER_PHASE_ONE_COUNTRIES = ["Canada", "United States"] as const;

export type PhaseOneCountry = "Canada" | "United States" | "other" | "unknown";

function gcd(left: number, right: number): number {
  return right === 0 ? left : gcd(right, left % right);
}

/** Canada first, then the United States, in the configured ratio. */
export function searchRegionCycle(split: { canada: number; us: number } = HUNTER_REGION_SPLIT): string[] {
  const canada = Math.max(0, Math.round(split.canada));
  const us = Math.max(0, Math.round(split.us));
  const divisor = gcd(canada, us) || 1;
  return [...Array(canada / divisor).fill("canada"), ...Array(us / divisor).fill("us")];
}

const CANADA_PLACE_TERMS = [
  "canada",
  "canadian",
  "calgary",
  "edmonton",
  "red deer",
  "lethbridge",
  "medicine hat",
  "fort mcmurray",
  "grande prairie",
  "canmore",
  "banff",
  "jasper",
  "toronto",
  "ottawa",
  "montreal",
  "montréal",
  "vancouver",
  "winnipeg",
  "halifax",
  "victoria",
  "regina",
  "saskatoon",
  "hamilton",
  "mississauga",
  "alberta",
  "british columbia",
  "ontario",
  "quebec",
  "québec",
  "manitoba",
  "saskatchewan",
  "nova scotia",
  "new brunswick",
  "newfoundland",
  "prince edward island",
  "northwest territories",
  "nunavut",
  "yukon",
];

const US_PLACE_TERMS = [
  "united states",
  "usa",
  "u.s.",
  "u.s.a",
  "seattle",
  "san francisco",
  "los angeles",
  "san diego",
  "denver",
  "chicago",
  "boston",
  "new york",
  "austin",
  "dallas",
  "houston",
  "atlanta",
  "miami",
  "portland",
  "phoenix",
  "philadelphia",
  "minneapolis",
  "detroit",
  "nashville",
  "silicon valley",
  "bay area",
  "alabama",
  "alaska",
  "arizona",
  "arkansas",
  "california",
  "colorado",
  "connecticut",
  "delaware",
  "florida",
  "hawaii",
  "idaho",
  "illinois",
  "indiana",
  "iowa",
  "kansas",
  "kentucky",
  "louisiana",
  "maine",
  "maryland",
  "massachusetts",
  "michigan",
  "minnesota",
  "mississippi",
  "missouri",
  "montana",
  "nebraska",
  "nevada",
  "new hampshire",
  "new jersey",
  "new mexico",
  "north carolina",
  "north dakota",
  "ohio",
  "oklahoma",
  "oregon",
  "pennsylvania",
  "rhode island",
  "south carolina",
  "south dakota",
  "tennessee",
  "texas",
  "utah",
  "vermont",
  "virginia",
  "washington",
  "west virginia",
  "wisconsin",
  "wyoming",
  "district of columbia",
];

const OTHER_PLACE_TERMS = [
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
  "mexico",
  "brazil",
  "australia",
  "new zealand",
  "japan",
  "singapore",
  "korea",
  "india",
  "china",
  "europe",
  "berlin",
  "paris",
  "amsterdam",
  "dublin",
  "tbilisi",
  "london",
];

const PLACE_ABBREV = /,\s*(ab|bc|sk|mb|qc|ns|nb|pe|nl|yt|nt|nu|al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|ia|ks|ky|la|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)\b/;

function hasTerm(hay: string, terms: readonly string[]) {
  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`).test(hay);
  });
}

/** Country named by a place string. Unknown when the text does not say. */
export function countryFromPlace(place: string): PhaseOneCountry {
  const hay = place.toLowerCase();
  if (!hay.trim()) return "unknown";
  if (/\bvancouver\b/.test(hay) && /\bwashington\b/.test(hay) && !/\b(canada|british columbia)\b/.test(hay)) return "United States";
  if (/\b(canada|canadian)\b/.test(hay)) return "Canada";
  if (/\b(united states|usa|u\.s\.a|u\.s\.)\b/.test(hay)) return "United States";
  if (/\bnew mexico\b/.test(hay)) return "United States";
  if (/\blondon\b/.test(hay) && /\b(ontario|canada)\b/.test(hay)) return "Canada";
  if (hasTerm(hay, OTHER_PLACE_TERMS)) return "other";
  if (hasTerm(hay, CANADA_PLACE_TERMS) || PLACE_ABBREV.test(hay)) {
    if (/\b(ns|nb|nl|yt|nt|nu|ab|bc|sk|mb|qc|pe)\b/.test(hay) || hasTerm(hay, CANADA_PLACE_TERMS)) return "Canada";
  }
  if (hasTerm(hay, US_PLACE_TERMS)) return "United States";
  if (PLACE_ABBREV.test(hay)) return "United States";
  if (hay === "calgary" || hay === "edmonton" || hay === "red deer" || hay === "alberta") return "Canada";
  return "unknown";
}

/** Headquarters or location sentence, when the place field is blank. */
export function headquartersText(page: string) {
  const match = page.match(/(?:headquarters|headquartered|head office|based|located|offices?)\s+(?:in|at)\s*:?\s*([A-Za-z][^.\n]{0,80})/i);
  return match?.[1]?.trim() ?? "";
}

/**
 * Canada or the United States, or other, or unknown.
 * Place text first, then the stored city, then a headquarters sentence on the page.
 */
export function companyCountry(input: { place?: string | null; city?: string | null; page?: string | null }): PhaseOneCountry {
  const fromPlace = countryFromPlace(input.place ?? "");
  if (fromPlace !== "unknown") return fromPlace;
  const city = (input.city ?? "").trim();
  const fromCity = countryFromPlace(city);
  if (fromCity !== "unknown") return fromCity;
  if (city === "Calgary" || city === "Edmonton" || city === "Red Deer" || city === "Alberta") return "Canada";
  const headquarters = headquartersText(input.page ?? "");
  if (headquarters) return countryFromPlace(headquarters);
  return "unknown";
}

export function isPhaseOneCompany(input: { place?: string | null; city?: string | null; page?: string | null }) {
  const country = companyCountry(input);
  return country === "Canada" || country === "United States";
}

/**
 * Soft regional priority inside a filed card. Review it each month.
 * Alberta and the rest of Canada come first, then Vancouver, then California and Washington.
 * Europe and Mexico keep a low score for old cards. Phase one does not search or file them.
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
  note: "Region weights and affordability signals are hypotheses. Review them each month. The weights are not a country filter. Phase one files Canada and the United States only, with Canada as the majority of the search. A forward-thinking technology company is a strong positive signal.",
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

/**
 * Place-based travel weight. A blank place, or one with no matching word, scores at the
 * lowest non-zero weight. The slot id is not a filter and does not raise that score.
 */
export function regionWeightForPlace(place: string, _regionId: string) {
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
  return HUNTER_REGION_WEIGHTS.elsewhere;
}

/** Contact-ready cards filed per Edmonton day. Both runs count together. */
export const HUNTER_DAILY_CARD_TARGET = 48;

export const HUNTER_ROSTER = {
  name: "Hunter",
  job: "One run. Every 30 minutes in working hours, Hunter works a signed Apollo campaign list. The first segment is technology companies in Canada and the United States, with no headcount cap. Canada is 70 percent of the draws unless a segment logs a different split. 48 contact-ready cards a day is the target under test. The nightly 4am sweep is stopped. Never sends.",
  trigger: "Every 30 minutes from 7am to 7pm Edmonton",
  owner: "christopher" as const,
  escalate: "A company that cannot be confirmed on a public page.",
  limits: [
    "Never sends",
    "Never invents a fact",
    "No new paid source without approval",
    "No daily call cap. The monthly dollar cap still stops the hunt",
    "Pause and the kill switch stop the hunt",
  ],
};
