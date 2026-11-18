/**
 * Ideal-customer profile for the Lead Hunter.
 * Edit this file to change who we look for. The search prompt reads it.
 * Points on the signals should add up to 50. Travel points are out of 10 and must stay above zero.
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
  /** Canada and the United States are higher. Europe is lower. Never zero. */
  travel: number;
  /** Empty means any verified place is in scope. */
  placeTerms: string[];
};

export type PartnerKind = {
  id: string;
  label: string;
  terms: string[];
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
    terms: ["offsite", "off-site", "away day", "culture programme", "culture program"],
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
];

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
    travel: 5,
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

export const PARTNER_KINDS: PartnerKind[] = [
  {
    id: "outdoor",
    label: "Outdoor or adventure brand",
    terms: ["outdoor", "adventure", "wilderness", "backcountry"],
  },
  {
    id: "sustainability",
    label: "Sustainability-led company",
    terms: ["b corp", "b corporation", "sustainability", "climate"],
  },
  {
    id: "gear",
    label: "Gear or apparel maker",
    terms: ["apparel", "footwear", "gear"],
  },
  {
    id: "travel",
    label: "Travel or retreat operator",
    terms: ["retreat", "expedition", "travel company"],
  },
  {
    id: "media",
    label: "Media or events brand",
    terms: ["media brand", "events brand", "conference", "festival"],
  },
];

/** One model call per cron tick. Stops for the rest of the Edmonton day at this count. */
export const HUNTER_DAILY_CALL_CAP = 48;

export const HUNTER_ROSTER = {
  name: "Hunter",
  job: "Find ideal customers worldwide. Never sends.",
  trigger: "Always on",
  owner: "christopher" as const,
  escalate: "A partnership flag, or a company outside this profile.",
  limits: ["Never sends", "Never invents a fact", "No paid data"],
};
