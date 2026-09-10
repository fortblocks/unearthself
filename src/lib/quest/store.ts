"use client";

import { create } from "zustand";
import { DEMO_PACK } from "@/data/quest/demoPack";
import type { InstancePack, Participant } from "@/data/quest/types";
import { findByJoinCode } from "./derive";
import { idbGet, idbSet, saveNote } from "./idb";

const CHANNEL = "trail-quest";
const KEY = "trail-quest-state-v1";

export type Role = "guest" | "facilitator" | null;

export type MirrorAnswers = Record<string, { choices: string[]; text: string }>;

export type Progress = {
  unlockedBeatIds: string[];
  completedBeatIds: string[];
  specimensFound: string[];
  assignedLocated: boolean;
  personalAuthenticated: boolean;
  recorderId: string | null;
  recorderStartedAt: number | null;
  claimedWatch: boolean;
  mirror: Record<string, MirrorAnswers>;
  experimentId: string | null;
  receivedRuneIds: string[];
  revealedRuneIds: string[];
  activatedRuneIds: string[];
  shuttle: {
    moment: string;
    happened: string;
    when: string;
    remember: string;
  } | null;
  thirty: { used: string; note: string } | null;
  broadcast: string | null;
  lateTeam: boolean;
  privacyAccepted: boolean;
  deviceChecked: boolean;
};

export type Session = {
  role: Role;
  participant: Participant | null;
  firstName: string;
};

const firstBeat = DEMO_PACK.beats[0]?.id ?? "welcome";

export const emptyProgress = (): Progress => ({
  unlockedBeatIds: [firstBeat],
  completedBeatIds: [],
  specimensFound: [],
  assignedLocated: false,
  personalAuthenticated: false,
  recorderId: null,
  recorderStartedAt: null,
  claimedWatch: false,
  mirror: {},
  experimentId: null,
  receivedRuneIds: [],
  revealedRuneIds: [],
  activatedRuneIds: [],
  shuttle: null,
  thirty: null,
  broadcast: null,
  lateTeam: false,
  privacyAccepted: false,
  deviceChecked: false,
});

type QuestState = {
  ready: boolean;
  pack: InstancePack;
  session: Session;
  progress: Progress;
  hydrate: () => Promise<void>;
  join: (code: string, firstName: string) => { ok: boolean; reason?: string };
  leave: () => void;
  acceptPrivacy: () => void;
  completeDeviceCheck: () => void;
  unlockBeat: (id: string) => void;
  unlockWithToken: (token: string) => { ok: boolean };
  completeBeat: (id: string) => void;
  setRecorder: (id: string | null) => void;
  claimWatch: () => void;
  findSpecimen: (id: string) => void;
  markAssignedLocated: () => void;
  markAuthenticated: () => void;
  saveMirror: (beatId: string, promptId: string, choices: string[], text: string) => void;
  setExperiment: (id: string) => void;
  receiveRune: (id: string) => void;
  revealRune: (id: string) => void;
  activateRune: (id: string) => void;
  setShuttle: (s: Progress["shuttle"]) => void;
  setThirty: (s: Progress["thirty"]) => void;
  setBroadcast: (msg: string | null) => void;
  markLate: (late: boolean) => void;
  resetDemo: () => void;
};

let channel: BroadcastChannel | null = null;

function pub(progress: Progress, session: Session) {
  if (typeof window === "undefined") return;
  void idbSet(KEY, { progress, session });
  try {
    channel ??= new BroadcastChannel(CHANNEL);
    channel.postMessage({ progress, session });
  } catch {
    /* ignore */
  }
}

export const useQuest = create<QuestState>((set, get) => ({
  ready: false,
  pack: DEMO_PACK,
  session: { role: null, participant: null, firstName: "" },
  progress: emptyProgress(),

  hydrate: async () => {
    if (typeof window === "undefined") return;
    try {
      const saved = await idbGet<{ progress: Progress; session: Session }>(KEY);
      if (saved?.progress) {
        set({ progress: { ...emptyProgress(), ...saved.progress }, session: saved.session, ready: true });
      } else {
        set({ ready: true });
      }
    } catch {
      set({ ready: true });
    }
    try {
      channel ??= new BroadcastChannel(CHANNEL);
      channel.onmessage = (ev) => {
        const data = ev.data as { progress?: Progress; session?: Session };
        if (data.progress) set({ progress: data.progress });
        if (data.session && get().session.role === "facilitator") {
          /* facilitator live view follows guest progress in this October same-origin demo */
        }
      };
    } catch {
      /* ignore */
    }
  },

  join: (code, firstName) => {
    const found = findByJoinCode(get().pack, code);
    if (!found) return { ok: false, reason: "That code is not in this instance." };
    const name = firstName.trim();
    if (!name) return { ok: false, reason: "Your name, as you want it said in the field." };
    const session: Session =
      found.role === "facilitator"
        ? { role: "facilitator", participant: null, firstName: name }
        : { role: "guest", participant: found.guest, firstName: name };
    const progress = get().progress.privacyAccepted ? get().progress : emptyProgress();
    set({ session, progress });
    pub(progress, session);
    return { ok: true };
  },

  leave: () => {
    const session = { role: null, participant: null, firstName: "" };
    set({ session });
    pub(get().progress, session);
  },

  acceptPrivacy: () => {
    const progress = { ...get().progress, privacyAccepted: true };
    set({ progress });
    pub(progress, get().session);
  },

  completeDeviceCheck: () => {
    const progress = { ...get().progress, deviceChecked: true };
    set({ progress });
    pub(progress, get().session);
  },

  unlockBeat: (id) => {
    const progress = get().progress;
    if (progress.unlockedBeatIds.includes(id)) return;
    const next = { ...progress, unlockedBeatIds: [...progress.unlockedBeatIds, id] };
    set({ progress: next });
    pub(next, get().session);
  },

  unlockWithToken: (token) => {
    const t = token.trim().toUpperCase();
    const beat = get().pack.beats.find((b) => b.paperToken === t);
    if (!beat) return { ok: false };
    get().unlockBeat(beat.id);
    return { ok: true };
  },

  completeBeat: (id) => {
    const progress = get().progress;
    const completed = progress.completedBeatIds.includes(id)
      ? progress.completedBeatIds
      : [...progress.completedBeatIds, id];
    const unlockedNow = progress.unlockedBeatIds.includes(id)
      ? progress.unlockedBeatIds
      : [...progress.unlockedBeatIds, id];
    const following = get().pack.beats.find((b) => !unlockedNow.includes(b.id));
    const nextUnlocked =
      following?.unlock === "sequence" ? [...unlockedNow, following.id] : unlockedNow;
    const next = { ...progress, completedBeatIds: completed, unlockedBeatIds: nextUnlocked };
    set({ progress: next });
    pub(next, get().session);
  },

  setRecorder: (id) => {
    const progress = {
      ...get().progress,
      recorderId: id,
      recorderStartedAt: id ? Date.now() : null,
      claimedWatch: false,
    };
    set({ progress });
    pub(progress, get().session);
  },

  claimWatch: () => {
    const me = get().session.participant?.id ?? null;
    const progress = {
      ...get().progress,
      recorderId: me,
      recorderStartedAt: Date.now(),
      claimedWatch: true,
    };
    set({ progress });
    pub(progress, get().session);
  },

  findSpecimen: (id) => {
    const progress = get().progress;
    if (progress.specimensFound.includes(id)) return;
    const next = { ...progress, specimensFound: [...progress.specimensFound, id] };
    set({ progress: next });
    pub(next, get().session);
  },

  markAssignedLocated: () => {
    const progress = { ...get().progress, assignedLocated: true };
    set({ progress });
    pub(progress, get().session);
  },

  markAuthenticated: () => {
    const progress = { ...get().progress, personalAuthenticated: true };
    set({ progress });
    pub(progress, get().session);
  },

  saveMirror: (beatId, promptId, choices, text) => {
    const progress = get().progress;
    const beatAnswers = { ...(progress.mirror[beatId] ?? {}) };
    beatAnswers[promptId] = { choices, text };
    const next = { ...progress, mirror: { ...progress.mirror, [beatId]: beatAnswers } };
    set({ progress: next });
    pub(next, get().session);
    const me = get().session.participant?.id ?? "anon";
    void saveNote({
      id: `${me}-${beatId}-${promptId}`,
      beatId,
      promptId,
      choices,
      text,
      at: new Date().toISOString(),
    });
  },

  setExperiment: (id) => {
    const progress = { ...get().progress, experimentId: id };
    set({ progress });
    pub(progress, get().session);
  },

  receiveRune: (id) => {
    const progress = get().progress;
    if (progress.receivedRuneIds.includes(id)) return;
    const next = { ...progress, receivedRuneIds: [...progress.receivedRuneIds, id] };
    set({ progress: next });
    pub(next, get().session);
  },

  revealRune: (id) => {
    const progress = get().progress;
    if (progress.revealedRuneIds.includes(id)) return;
    const next = { ...progress, revealedRuneIds: [...progress.revealedRuneIds, id] };
    set({ progress: next });
    pub(next, get().session);
  },

  activateRune: (id) => {
    const progress = get().progress;
    if (progress.activatedRuneIds.includes(id)) return;
    const next = { ...progress, activatedRuneIds: [...progress.activatedRuneIds, id] };
    set({ progress: next });
    pub(next, get().session);
  },

  setShuttle: (s) => {
    const progress = { ...get().progress, shuttle: s };
    set({ progress });
    pub(progress, get().session);
  },

  setThirty: (s) => {
    const progress = { ...get().progress, thirty: s };
    set({ progress });
    pub(progress, get().session);
  },

  setBroadcast: (msg) => {
    const progress = { ...get().progress, broadcast: msg };
    set({ progress });
    pub(progress, get().session);
  },

  markLate: (late) => {
    const progress = { ...get().progress, lateTeam: late };
    set({ progress });
    pub(progress, get().session);
  },

  resetDemo: () => {
    const progress = emptyProgress();
    const session = { role: null, participant: null, firstName: "" };
    set({ progress, session });
    pub(progress, session);
  },
}));

export function isUnlocked(progress: Progress, beatId: string) {
  return progress.unlockedBeatIds.includes(beatId);
}

export function beatPath(screen: string) {
  const map: Record<string, string> = {
    today: "/quest/today",
    quest: "/quest/play",
    boundary: "/quest/boundary",
    specimen: "/quest/specimen",
    recover: "/quest/recover",
    recorder: "/quest/recorder",
    mirror: "/quest/mirror",
    experiment: "/quest/experiment",
    runes: "/quest/runes",
    shuttle: "/quest/shuttle",
    thirty: "/quest/thirty",
  };
  return map[screen] ?? "/quest/today";
}
