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
    dek: "PACE is the path. Unearth Self is the purpose.",
    date: "September 2026",
    image: "/images/work/horseshoe.jpg",
    body: [
      "Most programmes arrive with a binder and a promise that three days will rearrange a life. That is not the offer. The product is the expedition. What sits under it is a language written with the canyon as editor.",
      "PACE is the sequence we take a group through: Play, Adaptability, Connection, Experience. Each is a Rune — a mark for a way of moving. You practise it on the ground. You carry it when you leave. Self-awareness lives in Echo: short prompts after time on the land.",
      "Behind that sits the Human Adaptation Model. How we protect, adapt, and choose again. The language people keep using after they drive home — and, later, a body of work that can travel without the valley.",
      "Trail Quest carries some of this in the field. GPS, offline prompts, paper if the phone dies. The canyon does the coaching.",
      "Come for the expedition. The language is there to be used, not displayed.",
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
      "The land does not need us to complete it. We need it to finish the work.",
    ],
  },
];

export function postBySlug(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}
