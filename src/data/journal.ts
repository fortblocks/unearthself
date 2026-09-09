export type JournalPost = {
  slug: string;
  title: string;
  kicker: string;
  dek: string;
  date: string;
  image: string;
  body: string[];
};

export const POSTS: JournalPost[] = [
  {
    slug: "this-town",
    title: "This town",
    kicker: "Place",
    dek: "Drumheller is not a larger Banff. That is why we built here.",
    date: "September 2026",
    image: "/images/basecamp/building.jpg",
    body: [
      "Seven thousand people. A river. A museum that holds the bones of the place. One hundred and seventy-six short-lets already fighting for the same weekend visitor. If you treat Drumheller as a hospitality problem you lose on amenities. The rooms are not the point.",
      "The town sits on deep time made visible. Coulees drop away from the highway. Hoodoos stand in the valley like something unfinished. Winter means it. Summer is short and loud with tourists who came for a dinosaur and leave with an ice cream. In between, the land is still there, and so are the people who live with it.",
      "We did not pick it as a backdrop. A conventional gym, spa and four-room guesthouse cannot win this market on towels. The move is to give someone a reason to come that does not currently exist — and to give locals a house they can use without pretending they are on holiday.",
      "Basecamp is on the block. Haven is four suites in a heritage house. Canalta takes the overflow when a group is larger than the four keys. Ninety minutes from Calgary. Edmonton is longer. There is no useful passenger rail. You drive. That is part of the work.",
      "If you want the mountain-resort version of wellness, keep driving west. If you want a town that will not flatter the itinerary, this is the stop.",
    ],
  },
  {
    slug: "the-work-underneath",
    title: "The work underneath",
    kicker: "Modality",
    dek: "PACE is the path. Unearth Self is the purpose. The rest is still being forged on the land.",
    date: "September 2026",
    image: "/images/work/horseshoe.jpg",
    body: [
      "Most programmes arrive finished. A binder. A certification. A promise that three days will rearrange a life. We are not selling that. The live product is the expedition. What sits under it is a language we are still writing, in public, with the canyon as editor.",
      "PACE is the sequence we take a group through: Play, Adaptability, Connection, Experience. Each is a Rune — a mark for a way of moving, not a personality type and not decoration. You practise it on the ground. You carry it when you leave. Self-awareness is not a fifth Rune. It lives in Echo: short prompts after time on the land. A mirror. Not a clinic.",
      "Behind that sits work Tess is leading called the Human Adaptation Model. How we protect, adapt, and choose again. It is not a course you can buy this month. When it is ready it will travel as language people keep using after they drive home — and later as an online body of work. Until then we will not print a finished methodology on a sales page and hope the land agrees.",
      "Trail Quest will carry some of this in the field. GPS, offline prompts, paper if the phone dies. No guest-facing coach in your pocket while you walk. The rule is simple: automate the company, not the canyon.",
      "Innovation, here, is not a new app. It is the discipline of not shipping a doctrine before the place has tested it. Come for the expedition. The language will be there when it has earned the right to travel.",
    ],
  },
  {
    slug: "the-land-does-not-flatter",
    title: "The land does not flatter",
    kicker: "The Badlands",
    dek: "Hoodoos, coulees, a river, weather that means it. This is the field.",
    date: "September 2026",
    image: "/images/exp-hoodoos.jpg",
    body: [
      "The Canadian Badlands are not scenery in the brochure sense. They are erosion made honest. Sandstone and coal and bone-coloured dust. A valley that drops faster than the eye expects. Horseshoe Canyon. Horsethief. The Red Deer moving through it as if the last ice age were last week.",
      "People come for dinosaurs and leave with a photograph of a hoodoo. Fair. The formations are older than any story we will tell about them. What the land is useful for, if you are paying attention, is pressure without a ceiling. There is no tree line to hide in. The weather arrives. The route you drew in the morning is a suggestion by noon.",
      "That is why the expedition lives here and not in a rented lodge with a view of someone else’s mountain. Play is easier to fake on a lawn. Adaptability is theoretical until the coulee decides. Connection is a slide until the group has to move as one on ground that does not care. Experience — meeting the moment you are actually in — is harder when the place keeps offering you a new one.",
      "Winter is not closed. Snowshoe country, short days, ice. Summer is heat and river and other people. Spring and autumn are the working months for teams: cool mornings, fewer coaches parked at the lookout.",
      "We will not sell an outdoor day until insurance and a named facilitator are in place. Until then the land is still the point. It does not need us to complete it. We need it to finish the work.",
    ],
  },
];

export function postBySlug(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}
