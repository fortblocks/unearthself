import { create } from "zustand";
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

type DeskState = {
  lookingAs: Partner;
  leads: Lead[];
  stays: Stay[];
  slots: TreatmentSlot[];
  shifts: Shift[];
  money: MoneyRow[];
  risk: RiskRow[];
  canalta: CanaltaHold[];
  setLookingAs: (p: Partner) => void;
  addLead: (input: {
    org: string;
    contact: string;
    kind: LeadKind;
    headcount: number;
    value: number;
    dates: string;
    owner: Partner;
    note?: string;
  }) => void;
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
};

function nextCode(prefix: string, rows: { id: string }[]) {
  const nums = rows
    .map((r) => Number(String(r.id).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(n).padStart(3, "0")}`;
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

export const useDesk = create<DeskState>()((set, get) => ({
  ...seed,
  setLookingAs: (p) => set({ lookingAs: p }),
  addLead: (input) =>
    set((s) => ({
      leads: [
        {
          id: nextCode("L", s.leads),
          kind: input.kind,
          org: input.org,
          contact: input.contact,
          owner: input.owner,
          headcount: input.headcount,
          value: input.value,
          weight: 0.3,
          status: "new",
          next: "Triage",
          dates: input.dates,
          note: input.note ?? "",
        },
        ...s.leads,
      ],
    })),
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
  reset: () => set({ ...seed, lookingAs: get().lookingAs }),
}));

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
