export type Partner = "christopher" | "tess" | "lisa" | "norah";
export type LeadStatus = "new" | "hold" | "proposal" | "won" | "lost";
export type LeadKind = "bootcamp" | "haven" | "basecamp";
export type LeadSource = "web" | "scout" | "direct" | "referral" | "form";
export type MoneyKind = "deposit" | "invoice" | "refund";
export type MoneyStatus = "due" | "sent" | "paid" | "overdue";
export type RiskKind = "waiver" | "weather" | "staffing";
export type RiskLevel = "watch" | "block";
export type SuiteSlug = "elowen" | "hidden-hollow" | "river-blossom" | "water-mark";
export type Channel = "direct" | "canalta" | "ota";

export const PARTNERS: { id: Partner; name: string; first: string; seat: string }[] = [
  { id: "lisa", name: "Lisa Hamilton", first: "Lisa", seat: "The house" },
  { id: "norah", name: "Norah Hamilton", first: "Norah", seat: "Numbers and treatments" },
  { id: "tess", name: "Tess Hamilton", first: "Tess", seat: "The work" },
  { id: "christopher", name: "Christopher Mair", first: "Christopher", seat: "The surface" },
];

export const SUITES: { slug: SuiteSlug; name: string; sleeps: number }[] = [
  { slug: "elowen", name: "Elowen", sleeps: 5 },
  { slug: "hidden-hollow", name: "Hidden Hollow", sleeps: 4 },
  { slug: "river-blossom", name: "River Blossom", sleeps: 4 },
  { slug: "water-mark", name: "Water Mark", sleeps: 4 },
];

export type Lead = {
  id: string;
  kind: LeadKind;
  org: string;
  contact: string;
  email: string;
  owner: Partner;
  headcount: number;
  value: number;
  weight: number;
  status: LeadStatus;
  next: string;
  dates: string;
  note: string;
  source: LeadSource;
  nudges: number;
  lastTouch: string;
  stopped: boolean;
};

export type Stay = {
  id: string;
  suite: SuiteSlug;
  guest: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  channel: Channel;
};

export type TreatmentSlot = {
  id: string;
  name: string;
  room: string;
  time: string;
  mins: number;
  guest: string;
  practitioner: string;
  price: number;
};

export type Shift = {
  id: string;
  name: string;
  role: string;
  hours: string;
};

export type MoneyRow = {
  id: string;
  kind: MoneyKind;
  party: string;
  amount: number;
  status: MoneyStatus;
  due: string;
  note: string;
};

export type RiskRow = {
  id: string;
  kind: RiskKind;
  level: RiskLevel;
  title: string;
  detail: string;
  owner: Partner;
  open: boolean;
};

export type CanaltaHold = {
  id: string;
  rooms: number;
  checkIn: string;
  checkOut: string;
  forLead: string;
};

export type RosBlock = { time: string; item: string; owner: string };
export type RosDay = { date: string; label: string; blocks: RosBlock[] };

export const TODAY = "2026-09-09";

export const SEED_LEADS: Lead[] = [
  {
    id: "L-041",
    kind: "bootcamp",
    org: "Apex Energy",
    contact: "Priya Shah · People",
    email: "priya.shah@apexenergy.example",
    owner: "christopher",
    headcount: 18,
    value: 54000,
    weight: 0.6,
    status: "proposal",
    next: "Send one-pager Friday",
    dates: "12–14 Nov",
    note: "18 pax. Haven takes the lead rooms; Canalta 20-room hold. 30% deposit to lock. Do not sell outdoor until D13 is signed.",
    source: "direct",
    nudges: 1,
    lastTouch: "2026-09-08",
    stopped: false,
  },
  {
    id: "L-038",
    kind: "bootcamp",
    org: "Drumheller Health",
    contact: "Mara Quinn · Nursing",
    email: "mara.quinn@dhhealth.example",
    owner: "tess",
    headcount: 8,
    value: 16800,
    weight: 0.4,
    status: "hold",
    next: "Confirm facilitator",
    dates: "late Oct",
    note: "Nursing team. Indoor / land-walk only until insurance closes. Tess holds the facilitator question.",
    source: "referral",
    nudges: 0,
    lastTouch: "2026-09-05",
    stopped: false,
  },
  {
    id: "L-044",
    kind: "haven",
    org: "Water Mark weekend",
    contact: "James Holt",
    email: "james.holt@example.com",
    owner: "lisa",
    headcount: 2,
    value: 590,
    weight: 0.8,
    status: "new",
    next: "Confirm 19–21 Sep",
    dates: "19–21 Sep",
    note: "Asked for Hidden Hollow. Direct. No deposit yet.",
    source: "web",
    nudges: 0,
    lastTouch: "2026-09-09",
    stopped: false,
  },
  {
    id: "L-040",
    kind: "basecamp",
    org: "Local circuit pack",
    contact: "Elena Voss",
    email: "elena.voss@example.com",
    owner: "norah",
    headcount: 1,
    value: 320,
    weight: 0.9,
    status: "won",
    next: "Book Fire & Ice Thu",
    dates: "11 Sep",
    note: "Won. Invoice sent. Unearthed Bodyworks today, circuit Thursday.",
    source: "direct",
    nudges: 0,
    lastTouch: "2026-09-09",
    stopped: true,
  },
  {
    id: "L-036",
    kind: "bootcamp",
    org: "Calgary stagette",
    contact: "Sophie Grant",
    email: "sophie.grant@example.com",
    owner: "tess",
    headcount: 12,
    value: 21600,
    weight: 0.25,
    status: "new",
    next: "Call back this week",
    dates: "spring 2027",
    note: "Friends group. Not a humiliation brief. Spring 2027 — do not let it eat a facilitator day this year.",
    source: "web",
    nudges: 0,
    lastTouch: "2026-09-07",
    stopped: false,
  },
  {
    id: "L-029",
    kind: "bootcamp",
    org: "Northwind Logistics",
    contact: "Dan Reid · HR",
    email: "dan.reid@northwind.example",
    owner: "christopher",
    headcount: 22,
    value: 66000,
    weight: 0.15,
    status: "lost",
    next: "Closed — Banff lodge",
    dates: "Oct",
    note: "Lost to a Banff lodge. Keep on the book so we do not chase the corpse.",
    source: "scout",
    nudges: 3,
    lastTouch: "2026-08-22",
    stopped: true,
  },
];

export const SEED_STAYS: Stay[] = [
  {
    id: "S-elowen-sep",
    suite: "elowen",
    guest: "Apex advance · 2",
    checkIn: "2026-09-08",
    checkOut: "2026-09-11",
    nights: 3,
    channel: "direct",
  },
  {
    id: "S-river-sep",
    suite: "river-blossom",
    guest: "Cole / Hart",
    checkIn: "2026-09-08",
    checkOut: "2026-09-10",
    nights: 2,
    channel: "direct",
  },
  {
    id: "S-water-out",
    suite: "water-mark",
    guest: "The Bensons",
    checkIn: "2026-09-06",
    checkOut: "2026-09-09",
    nights: 3,
    channel: "ota",
  },
  {
    id: "S-hollow-wknd",
    suite: "hidden-hollow",
    guest: "Hold · Holt",
    checkIn: "2026-09-19",
    checkOut: "2026-09-21",
    nights: 2,
    channel: "direct",
  },
];

export const SEED_SLOTS: TreatmentSlot[] = [
  {
    id: "T-1100",
    name: "Unearthed Bodyworks",
    room: "Clinician 2",
    time: "11:00",
    mins: 75,
    guest: "Elena Voss",
    practitioner: "Norah",
    price: 115,
  },
  {
    id: "T-1400",
    name: "Fire & Ice circuit",
    room: "Fire & Ice",
    time: "14:00",
    mins: 90,
    guest: "Apex advance",
    practitioner: "Lisa",
    price: 200,
  },
  {
    id: "T-1600",
    name: "RMT massage",
    room: "Clinician 3",
    time: "16:00",
    mins: 55,
    guest: "Cole",
    practitioner: "Darcie",
    price: 140,
  },
];

export const SEED_SHIFTS: Shift[] = [
  { id: "sh-lisa", name: "Lisa Hamilton", role: "FOH / the house", hours: "07:30–18:00" },
  { id: "sh-norah", name: "Norah Hamilton", role: "Treatments", hours: "10:00–17:00" },
  { id: "sh-darcie", name: "Darcie", role: "RMT", hours: "15:00–18:00" },
];

export const SEED_MONEY: MoneyRow[] = [
  {
    id: "M-01",
    kind: "deposit",
    party: "Apex Energy",
    amount: 16200,
    status: "due",
    due: "2026-09-19",
    note: "30% to hold 12–14 Nov",
  },
  {
    id: "M-02",
    kind: "invoice",
    party: "Elena Voss · circuit pack",
    amount: 320,
    status: "sent",
    due: "2026-09-11",
    note: "Won local pack",
  },
  {
    id: "M-03",
    kind: "invoice",
    party: "The Bensons · Water Mark",
    amount: 740,
    status: "paid",
    due: "2026-09-06",
    note: "OTA payout pending",
  },
  {
    id: "M-04",
    kind: "refund",
    party: "Advanced facial · cancelled",
    amount: 160,
    status: "overdue",
    due: "2026-09-08",
    note: "Guest no-show, still on card hold",
  },
  {
    id: "M-05",
    kind: "deposit",
    party: "Cole / Hart · River Blossom",
    amount: 250,
    status: "paid",
    due: "2026-09-01",
    note: "Direct stay",
  },
];

export const SEED_RISK: RiskRow[] = [
  {
    id: "R-01",
    kind: "waiver",
    level: "block",
    title: "Cole / Hart unsigned",
    detail: "River Blossom in-house. Thermal booked 14:00. No waiver on file.",
    owner: "lisa",
    open: true,
  },
  {
    id: "R-02",
    kind: "waiver",
    level: "watch",
    title: "Apex advance — one of two",
    detail: "Elowen. Second guest arrives tonight. Need signature before a canyon walk.",
    owner: "lisa",
    open: true,
  },
  {
    id: "R-03",
    kind: "weather",
    level: "watch",
    title: "Wind on the coulee",
    detail: "Afternoon gusts. Outdoor day not sold. Flag if anyone asks for a walk.",
    owner: "tess",
    open: true,
  },
  {
    id: "R-04",
    kind: "staffing",
    level: "block",
    title: "Sunday uncovered",
    detail: "Lisa off. No named FOH. Do not take same-day thermal.",
    owner: "lisa",
    open: true,
  },
];

export const SEED_CANALTA: CanaltaHold[] = [
  {
    id: "C-apex",
    rooms: 20,
    checkIn: "2026-11-12",
    checkOut: "2026-11-14",
    forLead: "Apex Energy",
  },
];

export const APEX_ROS: { leadId: string; title: string; days: RosDay[] } = {
  leadId: "L-041",
  title: "Apex Energy · 12–14 Nov",
  days: [
    {
      date: "2026-11-12",
      label: "Thu 12",
      blocks: [
        { time: "16:00", item: "Arrive · Elowen lead + Canalta overflow", owner: "Lisa" },
        { time: "18:00", item: "Land walk — town rim. No canyon.", owner: "Tess" },
        { time: "19:30", item: "Fire & Ice, split groups of 9", owner: "Norah" },
      ],
    },
    {
      date: "2026-11-13",
      label: "Fri 13",
      blocks: [
        { time: "07:30", item: "Quiet breakfast. No agenda talk.", owner: "Lisa" },
        { time: "09:00", item: "Adaptability morning (Dunning)", owner: "Tess" },
        { time: "14:00", item: "Connection work indoors", owner: "Tess" },
        { time: "17:00", item: "Contrast circuit + dinner", owner: "Norah" },
      ],
    },
    {
      date: "2026-11-14",
      label: "Sat 14",
      blocks: [
        { time: "08:00", item: "Play close + debrief", owner: "Tess" },
        { time: "11:30", item: "Keys back. Canalta release.", owner: "Lisa" },
      ],
    },
  ],
};

export const SUPPLIERS: { name: string; job: string; status: string; owner: string }[] = [
  { name: "Canalta Drumheller", job: "Overflow rooms", status: "Hold live for Apex. Terms unsigned (D12).", owner: "Lisa" },
  { name: "Canyon operator", job: "Abseil / cliff", status: "Seat open. Do not sell.", owner: "Lisa" },
  { name: "Royal Tyrrell", job: "Fossil day", status: "Conversation, not a contract.", owner: "Tess" },
  { name: "Darcie", job: "RMT", status: "Thu–Sat. 140 / 55 min.", owner: "Norah" },
];

export const FRIDAY = {
  occupancy: 0.62,
  treatmentHours: 18.5,
  cashIn: 990,
  cashPromised: 16520,
  week: "1–7 Sep",
};

export const ROOMS = ["Clinician 1", "Clinician 2", "Clinician 3", "Fire & Ice", "Meditation"] as const;
