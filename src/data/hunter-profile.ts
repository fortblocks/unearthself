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
    id: "alberta",
    label: "Alberta",
    travel: 10,
    placeTerms: ["calgary", "edmonton", "red deer", "alberta", "lethbridge", "medicine hat", "fort mcmurray", "grande prairie", "canmore", "banff", "jasper"],
  },
  {
    id: "canada",
    label: "rest of Canada",
    travel: 10,
    placeTerms: ["canada", "toronto", "vancouver", "ottawa", "montreal", "winnipeg", "halifax", "victoria"],
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
 * How often each region is searched. Alberta plus the rest of Canada are 21 of 28 slots (75%).
 * Alberta is the larger of those two. The United States is the largest share of what remains.
 * The list is fixed so a cursor walk is the same every time.
 */
export const HUNTER_SEARCH_WEIGHTS = {
  alberta: 15,
  canada: 6,
  us: 3,
  europe: 1,
  "asia-pacific": 1,
  "latin-america": 1,
  anywhere: 1,
} as const;

/** Spread the weights through one cycle. A higher weight is picked more often, not as a solid block. */
export function searchRegionCycle(weights: Record<string, number> = HUNTER_SEARCH_WEIGHTS): string[] {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const used = entries.map(() => 0);
  const cycle: string[] = [];
  for (let step = 0; step < total; step += 1) {
    let best = -1;
    let bestDebt = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < entries.length; index += 1) {
      const weight = entries[index]?.[1] ?? 0;
      if (used[index] >= weight) continue;
      const debt = weight * (step + 1) - used[index] * total;
      if (debt > bestDebt) {
        bestDebt = debt;
        best = index;
      }
    }
    if (best < 0) break;
    used[best] += 1;
    const id = entries[best]?.[0];
    if (id) cycle.push(id);
  }
  return cycle;
}

/**
 * When true, Hunter asks only for a company with a real office or team in Canada,
 * and drops a page that shows no Canadian place. Default true on this review branch.
 * Turning it on conflicts with spec 29 line 63, which says geography is never a filter.
 * It needs Chris's approval before production.
 */
export const HUNTER_REQUIRE_CANADIAN_OFFICE = true;

const CANADIAN_OFFICE_TERMS = [
  "canada",
  "canadian",
  "calgary",
  "edmonton",
  "red deer",
  "alberta",
  "lethbridge",
  "medicine hat",
  "fort mcmurray",
  "grande prairie",
  "canmore",
  "banff",
  "jasper",
  "toronto",
  "vancouver",
  "ottawa",
  "montreal",
  "montréal",
  "winnipeg",
  "halifax",
  "victoria",
  "regina",
  "saskatoon",
  "british columbia",
  "quebec",
  "québec",
  "ontario",
  "manitoba",
  "saskatchewan",
  "nova scotia",
  "new brunswick",
  "newfoundland",
];

/** A real office or team in Canada, as printed on the page. */
export function pageShowsCanadianOffice(page: string) {
  const hay = page.toLowerCase();
  return CANADIAN_OFFICE_TERMS.some((term) => hay.includes(term));
}

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
