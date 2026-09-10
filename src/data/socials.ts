export type SocialChannel = "x" | "linkedin" | "instagram";
export type PostStatus = "idea" | "draft" | "queued" | "posted" | "killed";

export type SocialPost = {
  id: string;
  channel: SocialChannel;
  status: PostStatus;
  title: string;
  body: string;
  when: string;
  impressions: number;
  likes: number;
  replies: number;
  note: string;
};

export const CHANNELS: { id: SocialChannel; label: string }[] = [
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
];

export const SEED_POSTS: SocialPost[] = [
  {
    id: "P-01",
    channel: "x",
    status: "posted",
    title: "Spring 2027 first teams",
    body: "Spring bookings are open. Drumheller. Teams who want to be among the first — unearthself.xyz/spring",
    when: "2026-09-08",
    impressions: 1840,
    likes: 27,
    replies: 4,
    note: "Logged on the book. Not a live API.",
  },
  {
    id: "P-02",
    channel: "linkedin",
    status: "posted",
    title: "Not another hotel offsite",
    body: "Four rooms on the coulee, a working spa, a programme Tess can run. Spring 2027 is open for first teams.",
    when: "2026-09-09",
    impressions: 920,
    likes: 41,
    replies: 6,
    note: "Logged on the book. Not a live API.",
  },
  {
    id: "P-03",
    channel: "instagram",
    status: "queued",
    title: "Haven is four rooms",
    body: "Elowen, Hidden Hollow, River Blossom, Water Mark. That is the house. Overflow is a conversation with Lisa, not a second lodge we pretend to own.",
    when: "2026-09-11",
    impressions: 0,
    likes: 0,
    replies: 0,
    note: "Needs a still from the building. No stock canyon.",
  },
  {
    id: "P-04",
    channel: "x",
    status: "idea",
    title: "Fire & Ice, local",
    body: "The contrast circuit is on the book for locals, not only for teams. Ask Norah. Do not call it a challenge.",
    when: "",
    impressions: 0,
    likes: 0,
    replies: 0,
    note: "Local Facebook/Instagram first. Keep Ember off the caption.",
  },
  {
    id: "P-05",
    channel: "linkedin",
    status: "draft",
    title: "What the days are for",
    body: "Self-awareness under pressure. Connection beyond workplace roles. Adaptive collaboration. Grounded decisions. That is the offer. The land does the rest.",
    when: "",
    impressions: 0,
    likes: 0,
    replies: 0,
    note: "Tess signs this before it posts. Do not add Existence/Experience.",
  },
];
