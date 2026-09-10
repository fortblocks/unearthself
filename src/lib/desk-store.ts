import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  SEED_SCOUT,
  SEED_THREADS,
  type BotId,
  type ScoutTarget,
  type ThreadDir,
  type ThreadMsg,
} from "@/data/bots";
import {
  PARTNERS,
  SEED_CANALTA,
  SEED_LEADS,
  SEED_MONEY,
  SEED_RISK,
  SEED_SHIFTS,
  SEED_SLOTS,
  SEED_STAYS,
  type CanaltaHold,
  type Channel,
  type Lead,
  type LeadKind,
  type LeadSource,
  type LeadStatus,
  type MoneyKind,
  type MoneyRow,
  type MoneyStatus,
  type Partner,
  type RiskKind,
  type RiskLevel,
  type RiskRow,
  type Shift,
  type Stay,
  type SuiteSlug,
  type TreatmentSlot,
} from "@/data/desk";
import { SEED_POSTS, type PostStatus, type SocialChannel, type SocialPost } from "@/data/socials";
import { draftFor } from "@/lib/bot-copy";

type DeskState = {
  lookingAs: Partner;
  leads: Lead[];
  stays: Stay[];
  slots: TreatmentSlot[];
  shifts: Shift[];
  money: MoneyRow[];
  risk: RiskRow[];
  canalta: CanaltaHold[];
  threads: ThreadMsg[];
  scout: ScoutTarget[];
  posts: SocialPost[];
  paused: Record<BotId, boolean>;
  setLookingAs: (p: Partner) => void;
  addLead: (input: {
    org: string;
    contact: string;
    email?: string;
    kind: LeadKind;
    headcount: number;
    value: number;
    dates: string;
    owner: Partner;
    note?: string;
    source?: LeadSource;
  }) => string;
  setLeadStatus: (id: string, status: LeadStatus) => void;
  addStay: (input: {
    suite: SuiteSlug;
    guest: string;
    checkIn: string;
    checkOut: string;
    channel: Channel;
  }) => string | null;
  addSlot: (input: {
    name: string;
    room: string;
    time: string;
    mins: number;
    guest: string;
    practitioner: string;
    price: number;
  }) => void;
  addMoney: (input: {
    kind: MoneyKind;
    party: string;
    amount: number;
    due: string;
    note: string;
  }) => void;
  markMoney: (id: string, status: MoneyStatus) => void;
  addRisk: (input: {
    kind: RiskKind;
    level: RiskLevel;
    title: string;
    detail: string;
    owner: Partner;
  }) => void;
  closeRisk: (id: string) => void;
  reopenRisk: (id: string) => void;
  toggleBot: (id: BotId) => void;
  draftMail: (leadId: string, bot: BotId) => string | null;
  sendMail: (leadId: string, bot: BotId) => string | null;
  logReply: (leadId: string, body: string) => void;
  stopLead: (leadId: string) => void;
  fileScout: (id: string) => string | null;
  skipScout: (id: string) => void;
  setPostStatus: (id: string, status: PostStatus) => void;
  queueIdea: (channel: SocialChannel, title: string, body: string) => void;
  logPostMetrics: (id: string, impressions: number, likes: number, replies: number) => void;
  reset: () => void;
};

const seed = {
  lookingAs: "lisa" as Partner,
  leads: SEED_LEADS,
  stays: SEED_STAYS,
  slots: SEED_SLOTS,
  shifts: SEED_SHIFTS,
  money: SEED_MONEY,
  risk: SEED_RISK,
  canalta: SEED_CANALTA,
  threads: SEED_THREADS,
  scout: SEED_SCOUT,
  posts: SEED_POSTS,
  paused: {
    concierge: false,
    corporate: false,
    stay: false,
    followup: false,
    morning: false,
    friday: false,
    scribe: true,
  } as Record<BotId, boolean>,
};

function nextCode(prefix: string, rows: { id: string }[]) {
  const nums = rows
    .map((r) => Number(String(r.id).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

function stamp() {
  return new Date().toISOString();
}

function today() {
  return stamp().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const a = Date.parse(`${checkIn}T12:00:00`);
  const b = Date.parse(`${checkOut}T12:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.round((b - a) / 86_400_000);
}

export function suiteHeld(stays: Stay[], suite: SuiteSlug, checkIn: string, checkOut: string) {
  return stays.some((s) => s.suite === suite && s.checkIn < checkOut && s.checkOut > checkIn);
}

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      ...seed,
      setLookingAs: (p) => set({ lookingAs: p }),
      addLead: (input) => {
        const id = nextCode("L", get().leads);
        set((s) => ({
          leads: [
            {
              id,
              kind: input.kind,
              org: input.org,
              contact: input.contact,
              email: input.email ?? "",
              owner: input.owner,
              headcount: input.headcount,
              value: input.value,
              weight: 0.3,
              status: "new",
              next: "Triage",
              dates: input.dates,
              note: input.note ?? "",
              source: input.source ?? "direct",
              nudges: 0,
              lastTouch: today(),
              stopped: false,
            },
            ...s.leads,
          ],
        }));
        return id;
      },
      setLeadStatus: (id, status) =>
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)),
        })),
      addStay: (input) => {
        const { stays } = get();
        if (suiteHeld(stays, input.suite, input.checkIn, input.checkOut)) return "held";
        set((s) => ({
          stays: [
            ...s.stays,
            {
              id: nextCode("S", s.stays),
              suite: input.suite,
              guest: input.guest,
              checkIn: input.checkIn,
              checkOut: input.checkOut,
              nights: nightsBetween(input.checkIn, input.checkOut),
              channel: input.channel,
            },
          ],
        }));
        return null;
      },
      addSlot: (input) =>
        set((s) => ({
          slots: [...s.slots, { id: nextCode("T", s.slots), ...input }].sort((a, b) =>
            a.time.localeCompare(b.time),
          ),
        })),
      addMoney: (input) =>
        set((s) => ({
          money: [
            {
              id: nextCode("M", s.money),
              kind: input.kind,
              party: input.party,
              amount: input.amount,
              status: "due",
              due: input.due,
              note: input.note,
            },
            ...s.money,
          ],
        })),
      markMoney: (id, status) =>
        set((s) => ({
          money: s.money.map((m) => (m.id === id ? { ...m, status } : m)),
        })),
      addRisk: (input) =>
        set((s) => ({
          risk: [
            {
              id: nextCode("R", s.risk),
              ...input,
              open: true,
            },
            ...s.risk,
          ],
        })),
      closeRisk: (id) =>
        set((s) => ({
          risk: s.risk.map((r) => (r.id === id ? { ...r, open: false } : r)),
        })),
      reopenRisk: (id) =>
        set((s) => ({
          risk: s.risk.map((r) => (r.id === id ? { ...r, open: true } : r)),
        })),
      toggleBot: (id) =>
        set((s) => ({
          paused: { ...s.paused, [id]: !s.paused[id] },
        })),
      draftMail: (leadId, bot) => {
        const lead = get().leads.find((l) => l.id === leadId);
        if (!lead) return "missing";
        if (lead.stopped || lead.status === "lost" || lead.status === "won") return "closed";
        if (get().paused[bot]) return "paused";
        if (bot === "followup" && lead.nudges >= 3) return "cap";
        if (lead.source === "scout" && !lead.email) return "unnamed";
        const copy = draftFor(bot, lead);
        set((s) => ({
          threads: [
            {
              id: nextCode("M", s.threads),
              leadId,
              bot,
              dir: "draft",
              at: stamp(),
              subject: copy.subject,
              body: copy.body,
            },
            ...s.threads,
          ],
          leads: s.leads.map((l) =>
            l.id === leadId ? { ...l, next: `Draft waiting · ${bot}` } : l,
          ),
        }));
        return null;
      },
      sendMail: (leadId, bot) => {
        const lead = get().leads.find((l) => l.id === leadId);
        if (!lead) return "missing";
        if (lead.stopped || lead.status === "lost") return "closed";
        if (get().paused[bot]) return "paused";
        if (lead.nudges >= 3 && bot === "followup") return "cap";
        if (lead.source === "scout" && !lead.email) return "unnamed";
        let draft = get().threads.find((m) => m.leadId === leadId && m.dir === "draft" && m.bot === bot);
        if (!draft) {
          const fail = get().draftMail(leadId, bot);
          if (fail) return fail;
          draft = get().threads.find((m) => m.leadId === leadId && m.dir === "draft" && m.bot === bot);
        }
        if (!draft) return "missing";
        const nudge = bot === "followup" || bot === "concierge" || bot === "corporate" || bot === "stay";
        set((s) => ({
          threads: s.threads.map((m) => (m.id === draft!.id ? { ...m, dir: "out" as ThreadDir, at: stamp() } : m)),
          leads: s.leads.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  nudges: nudge ? l.nudges + 1 : l.nudges,
                  lastTouch: today(),
                  next: l.nudges + (nudge ? 1 : 0) >= 3 ? "Stopped — three nudges" : "Wait 48h, then 7d",
                  stopped: l.nudges + (nudge ? 1 : 0) >= 3,
                }
              : l,
          ),
        }));
        if (lead.email && typeof window !== "undefined") {
          const url = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
          window.open(url, "_self");
        }
        return null;
      },
      logReply: (leadId, body) => {
        const text = body.trim();
        if (!text) return;
        set((s) => ({
          threads: [
            {
              id: nextCode("M", s.threads),
              leadId,
              bot: "concierge",
              dir: "in",
              at: stamp(),
              subject: "Inbound",
              body: text,
            },
            ...s.threads,
          ],
          leads: s.leads.map((l) =>
            l.id === leadId
              ? { ...l, next: "Human — they replied", lastTouch: today(), stopped: true, status: l.status === "new" ? "hold" : l.status }
              : l,
          ),
        }));
      },
      stopLead: (leadId) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === leadId ? { ...l, stopped: true, next: "Stopped — do not nudge" } : l,
          ),
          threads: [
            {
              id: nextCode("M", s.threads),
              leadId,
              bot: "followup",
              dir: "note",
              at: stamp(),
              subject: "Stopped",
              body: "Sequence stopped on the book. Do not send.",
            },
            ...s.threads,
          ],
        })),
      fileScout: (id) => {
        const t = get().scout.find((s) => s.id === id);
        if (!t || t.status !== "watch") return "missing";
        const leadId = get().addLead({
          org: t.org,
          contact: "Unnamed — research only",
          email: "",
          kind: "bootcamp",
          headcount: 12,
          value: 18000,
          dates: "spring 2027",
          owner: "christopher",
          note: `${t.city}. ${t.why} Do not send until a named person exists.`,
          source: "scout",
        });
        set((s) => ({
          scout: s.scout.map((x) => (x.id === id ? { ...x, status: "filed" as const } : x)),
          threads: [
            {
              id: nextCode("M", s.threads),
              leadId,
              bot: "corporate",
              dir: "note",
              at: stamp(),
              subject: "Scout filed",
              body: `Research card filed from ${t.city}. No named contact. Concierge must not send.`,
            },
            ...s.threads,
          ],
        }));
        return leadId;
      },
      skipScout: (id) =>
        set((s) => ({
          scout: s.scout.map((x) => (x.id === id ? { ...x, status: "skip" as const } : x)),
        })),
      setPostStatus: (id, status) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? { ...p, status, when: status === "posted" && !p.when ? today() : p.when }
              : p,
          ),
        })),
      queueIdea: (channel, title, body) =>
        set((s) => ({
          posts: [
            {
              id: nextCode("P", s.posts),
              channel,
              status: "idea",
              title,
              body,
              when: "",
              impressions: 0,
              likes: 0,
              replies: 0,
              note: "From the desk. Tess signs product language.",
            },
            ...s.posts,
          ],
        })),
      logPostMetrics: (id, impressions, likes, replies) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, impressions, likes, replies } : p)),
        })),
      reset: () => set({ ...seed, lookingAs: get().lookingAs }),
    }),
    {
      name: "unearthself-desk-v3",
      version: 3,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<DeskState>;
        return {
          ...seed,
          ...p,
          leads: (p.leads ?? seed.leads).map((l) => ({
            ...l,
            email: l.email ?? "",
            source: l.source ?? "direct",
            nudges: l.nudges ?? 0,
            lastTouch: l.lastTouch ?? "",
            stopped: l.stopped ?? false,
          })),
          threads: p.threads ?? seed.threads,
          scout: p.scout ?? seed.scout,
          posts: p.posts ?? seed.posts,
          paused: { ...seed.paused, ...p.paused },
        };
      },
    },
  ),
);

export function partnerName(id: Partner) {
  return PARTNERS.find((p) => p.id === id)?.name ?? id;
}

export function partnerFirst(id: Partner) {
  return PARTNERS.find((p) => p.id === id)?.first ?? id;
}

export function weightedPipeline(leads: Lead[]) {
  return leads
    .filter((l) => l.status !== "lost" && l.status !== "won")
    .reduce((sum, l) => sum + l.value * l.weight, 0);
}

export function openPipeline(leads: Lead[]) {
  return leads.filter((l) => l.status !== "lost" && l.status !== "won");
}

export function ingestSpringEnquiry(input: {
  name: string;
  email: string;
  company: string;
  role: string;
  headcount: string;
  window: string;
  notes: string;
}) {
  const heads = Number(String(input.headcount).replace(/\D/g, "")) || 8;
  const id = useDesk.getState().addLead({
    org: input.company,
    contact: input.role ? `${input.name} · ${input.role}` : input.name,
    email: input.email,
    kind: "bootcamp",
    headcount: heads,
    value: 18000,
    dates: input.window || "spring 2027",
    owner: "christopher",
    note: input.notes || "From /spring.",
    source: "form",
  });
  useDesk.setState((s) => ({
    threads: [
      {
        id: nextCode("M", s.threads),
        leadId: id,
        bot: "concierge",
        dir: "in",
        at: stamp(),
        subject: "Spring 2027 enquiry",
        body: input.notes || "Form submitted. Concierge to draft. Do not invent a price.",
      },
      ...s.threads,
    ],
    leads: s.leads.map((l) => (l.id === id ? { ...l, next: "Concierge draft" } : l)),
  }));
  return id;
}
