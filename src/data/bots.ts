import type { Partner } from "@/data/desk";

export type BotId =
  | "concierge"
  | "corporate"
  | "stay"
  | "followup"
  | "morning"
  | "friday"
  | "scribe";

export type Bot = {
  id: BotId;
  name: string;
  job: string;
  trigger: string;
  owner: Partner;
  escalate: string;
  limits: string[];
};

export type ThreadDir = "in" | "out" | "draft" | "note";

export type ThreadMsg = {
  id: string;
  leadId: string;
  bot: BotId;
  dir: ThreadDir;
  at: string;
  subject: string;
  body: string;
};

export type ScoutTarget = {
  id: string;
  org: string;
  city: "Calgary" | "Edmonton";
  sector: string;
  why: string;
  status: "watch" | "filed" | "skip";
};

export const BOTS: Bot[] = [
  {
    id: "concierge",
    name: "Concierge",
    job: "Qualify a new enquiry. Audience, package, dates, headcount. No price invented.",
    trigger: "New web form or filed scout",
    owner: "christopher",
    escalate: "Safety, accessibility, distress, or money over CAD 5,000",
    limits: ["Never invent a rate", "Offer a human on the first reply", "Do not promise a canyon day"],
  },
  {
    id: "corporate",
    name: "Corporate AE",
    job: "Named team enquiries. One-pager, three dates, a call. Log the objection.",
    trigger: "Kind = bootcamp and a named person exists",
    owner: "christopher",
    escalate: "Press, legal, or Tess product questions",
    limits: ["Do not diagnose Echoes", "Do not sell outdoor until D13", "No HAM-as-finished"],
  },
  {
    id: "stay",
    name: "Stay & Spa",
    job: "Haven nights and treatments. Hold a suite. Do not double-book.",
    trigger: "Kind = haven or basecamp",
    owner: "lisa",
    escalate: "Same-day thermal on an uncovered day",
    limits: ["Inventory is the book, not the bot", "No door codes in mail"],
  },
  {
    id: "followup",
    name: "Follow-up",
    job: "48h, then 7d, then stop. Human-sounding. Never a fourth nudge.",
    trigger: "No reply on an open file",
    owner: "christopher",
    escalate: "They asked to stop",
    limits: ["Stop after three unanswered", "Stop on any inbound", "Do not chase a lost file"],
  },
  {
    id: "morning",
    name: "Morning Brief",
    job: "07:00 MT ops snapshot to partners.",
    trigger: "Daily 07:00 America/Edmonton",
    owner: "lisa",
    escalate: "Open block-level risk",
    limits: ["Facts from the book only"],
  },
  {
    id: "friday",
    name: "Friday Digest",
    job: "Commercial snapshot. Occupancy, hours, pipeline, cash, issues.",
    trigger: "Friday 16:00 America/Edmonton",
    owner: "norah",
    escalate: "Numbers Norah has not signed",
    limits: ["Do not publish a price", "Norah owns Friday numbers"],
  },
  {
    id: "scribe",
    name: "Scribe",
    job: "After a partner meeting, propose a patch to the OS. Human merges.",
    trigger: "Christopher files notes",
    owner: "christopher",
    escalate: "Anything that would close an open decision",
    limits: ["Recommend, do not close", "No silent edits to 01–08"],
  },
];

export const SEED_SCOUT: ScoutTarget[] = [
  {
    id: "T-01",
    org: "Calgary mid-size energy operator",
    city: "Calgary",
    sector: "Energy / people",
    why: "Teams of 12–20. Offsite season is Banff by default. We are the other option.",
    status: "watch",
  },
  {
    id: "T-02",
    org: "Edmonton civic or health department",
    city: "Edmonton",
    sector: "Public sector",
    why: "Nursing and ops teams already appear on the book. Indoor-first until D13.",
    status: "watch",
  },
  {
    id: "T-03",
    org: "Calgary professional-services firm",
    city: "Calgary",
    sector: "Legal / advisory",
    why: "HR buys ‘not another hotel ballroom’. Spring 2027 first-wave.",
    status: "watch",
  },
  {
    id: "T-04",
    org: "Edmonton university or varsity staff",
    city: "Edmonton",
    sector: "Education",
    why: "8–16 headcount. Weekday hold, not a weekend stag.",
    status: "watch",
  },
  {
    id: "T-05",
    org: "Calgary construction or trades HQ",
    city: "Calgary",
    sector: "Trades",
    why: "Safety culture, not wellness theatre. Land does the work.",
    status: "watch",
  },
  {
    id: "T-06",
    org: "Red Deer / Drumheller regional employer",
    city: "Calgary",
    sector: "Regional",
    why: "Drive-in. Haven plus local spa. Do not invent a named person.",
    status: "watch",
  },
];

export const SEED_THREADS: ThreadMsg[] = [
  {
    id: "M-001",
    leadId: "L-041",
    bot: "corporate",
    dir: "out",
    at: "2026-09-08T15:10:00",
    subject: "Apex Energy — dates and a hold",
    body: "Priya — thank you for the time last week. 12–14 Nov still sits on our book for 18 people. Haven takes the lead rooms; overflow is a Canalta hold, not a promise until Lisa has terms. I will not put a number on this mail. If the window is still live, Tess and I can do a twenty-minute call Friday.",
  },
  {
    id: "M-002",
    leadId: "L-041",
    bot: "followup",
    dir: "draft",
    at: "2026-09-10T11:00:00",
    subject: "Apex Energy — still holding 12–14 Nov",
    body: "Priya — a short note. The November window is still open. If it has moved, say so and we will release the hold. If it has not, I can send the one-pager and three other dates.",
  },
  {
    id: "M-003",
    leadId: "L-044",
    bot: "stay",
    dir: "draft",
    at: "2026-09-10T09:30:00",
    subject: "Hidden Hollow 19–21 Sep",
    body: "James — Hidden Hollow is free those nights. Two nights, direct. Reply and Lisa will hold it. Deposit follows.",
  },
  {
    id: "M-004",
    leadId: "L-029",
    bot: "followup",
    dir: "note",
    at: "2026-08-22T10:00:00",
    subject: "Stopped",
    body: "Three nudges, then Banff. Sequence stopped. Do not reopen from a bot.",
  },
];
