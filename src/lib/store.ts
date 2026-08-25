"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { SAMPLE_ITINERARIES } from "@/data/samples";
import {
  DEFAULT_DAYS,
  MAX_DAYS,
  MIN_DAYS,
  type DayPlan,
  type Intensity,
  type PlacedActivity,
  type Season,
  type TimeBlock,
} from "@/lib/types";
import {
  canFitActivity,
  createEmptyDay,
  detectCurrentSeason,
} from "@/lib/time";

interface BuilderStore {
  title: string;
  days: DayPlan[];
  season: Season | "auto";
  intensityPreset: Intensity | null;
  groupSize: number;
  shareId: string;
  selectedDayIndex: number;
  catalogueQuery: string;
  catalogueCategory: string | "all";
  setTitle: (title: string) => void;
  setGroupSize: (size: number) => void;
  setSeason: (season: Season | "auto") => void;
  setSelectedDayIndex: (index: number) => void;
  setCatalogueQuery: (q: string) => void;
  setCatalogueCategory: (c: string | "all") => void;
  setDayCount: (count: number) => void;
  addActivityToBlock: (
    dayIndex: number,
    block: TimeBlock,
    activityId: string,
    durationMin: number
  ) => { ok: boolean; reason?: string };
  removeActivity: (
    dayIndex: number,
    block: TimeBlock,
    instanceId: string
  ) => void;
  toggleLock: (
    dayIndex: number,
    block: TimeBlock,
    instanceId: string
  ) => void;
  moveActivity: (
    fromDay: number,
    fromBlock: TimeBlock,
    toDay: number,
    toBlock: TimeBlock,
    instanceId: string,
    toIndex?: number
  ) => { ok: boolean; reason?: string };
  reorderInBlock: (
    dayIndex: number,
    block: TimeBlock,
    activeId: string,
    overId: string
  ) => void;
  loadSample: (intensity: Intensity) => void;
  clearAll: () => void;
  loadFromShare: (payload: {
    title: string;
    days: DayPlan[];
    season: Season | "auto";
    intensityPreset: Intensity | null;
    groupSize: number;
  }) => void;
  getEffectiveSeason: () => Season;
}

function makeDays(count: number): DayPlan[] {
  return Array.from({ length: count }, (_, i) => createEmptyDay(i));
}

function remakeIds(days: DayPlan[]): DayPlan[] {
  return days.map((day, i) => ({
    ...day,
    id: `day-${i + 1}-${nanoid(6)}`,
    label: `Day ${i + 1}`,
    blocks: {
      morning: day.blocks.morning.map((p) => ({
        ...p,
        instanceId: nanoid(8),
      })),
      afternoon: day.blocks.afternoon.map((p) => ({
        ...p,
        instanceId: nanoid(8),
      })),
      evening: day.blocks.evening.map((p) => ({
        ...p,
        instanceId: nanoid(8),
      })),
    },
  }));
}

export const useBuilderStore = create<BuilderStore>()(
  persist(
    (set, get) => ({
      title: "Custom Badlands Retreat",
      days: makeDays(DEFAULT_DAYS),
      season: "auto",
      intensityPreset: null,
      groupSize: 12,
      shareId: nanoid(10),
      selectedDayIndex: 0,
      catalogueQuery: "",
      catalogueCategory: "all",

      setTitle: (title) => set({ title }),
      setGroupSize: (groupSize) => set({ groupSize: Math.max(1, groupSize) }),
      setSeason: (season) => set({ season }),
      setSelectedDayIndex: (selectedDayIndex) => set({ selectedDayIndex }),
      setCatalogueQuery: (catalogueQuery) => set({ catalogueQuery }),
      setCatalogueCategory: (catalogueCategory) => set({ catalogueCategory }),

      setDayCount: (count) => {
        const next = Math.min(MAX_DAYS, Math.max(MIN_DAYS, count));
        set((state) => {
          const days = [...state.days];
          if (next > days.length) {
            while (days.length < next) {
              days.push(createEmptyDay(days.length));
            }
          } else if (next < days.length) {
            days.length = next;
          }
          days.forEach((d, i) => {
            d.label = `Day ${i + 1}`;
          });
          return {
            days,
            selectedDayIndex: Math.min(state.selectedDayIndex, next - 1),
          };
        });
      },

      addActivityToBlock: (dayIndex, block, activityId, durationMin) => {
        const state = get();
        const day = state.days[dayIndex];
        if (!day) return { ok: false, reason: "Day not found" };
        const items = day.blocks[block];
        if (items.some((i) => i.locked)) {
          // allow add if not all locked — only block if we're inserting into locked flow? Skip: lock is per activity
        }
        if (!canFitActivity(items, block, durationMin)) {
          return {
            ok: false,
            reason: "Not enough time in this block (includes transfer buffer).",
          };
        }
        const placed: PlacedActivity = {
          instanceId: nanoid(8),
          activityId,
          durationMin,
          locked: false,
        };
        set({
          days: state.days.map((d, i) =>
            i === dayIndex
              ? {
                  ...d,
                  blocks: {
                    ...d.blocks,
                    [block]: [...d.blocks[block], placed],
                  },
                }
              : d
          ),
          intensityPreset: null,
        });
        return { ok: true };
      },

      removeActivity: (dayIndex, block, instanceId) => {
        set((state) => ({
          days: state.days.map((d, i) => {
            if (i !== dayIndex) return d;
            const target = d.blocks[block].find((p) => p.instanceId === instanceId);
            if (target?.locked) return d;
            return {
              ...d,
              blocks: {
                ...d.blocks,
                [block]: d.blocks[block].filter((p) => p.instanceId !== instanceId),
              },
            };
          }),
          intensityPreset: null,
        }));
      },

      toggleLock: (dayIndex, block, instanceId) => {
        set((state) => ({
          days: state.days.map((d, i) => {
            if (i !== dayIndex) return d;
            return {
              ...d,
              blocks: {
                ...d.blocks,
                [block]: d.blocks[block].map((p) =>
                  p.instanceId === instanceId ? { ...p, locked: !p.locked } : p
                ),
              },
            };
          }),
        }));
      },

      moveActivity: (fromDay, fromBlock, toDay, toBlock, instanceId, toIndex) => {
        const state = get();
        const sourceDay = state.days[fromDay];
        if (!sourceDay) return { ok: false, reason: "Source day missing" };
        const item = sourceDay.blocks[fromBlock].find(
          (p) => p.instanceId === instanceId
        );
        if (!item) return { ok: false, reason: "Activity not found" };
        if (item.locked) return { ok: false, reason: "Activity is locked" };

        const sameBlock = fromDay === toDay && fromBlock === toBlock;
        const destItems = state.days[toDay].blocks[toBlock].filter(
          (p) => p.instanceId !== instanceId
        );

        if (!sameBlock && !canFitActivity(destItems, toBlock, item.durationMin)) {
          return {
            ok: false,
            reason: "Not enough time in destination block.",
          };
        }

        set({
          days: state.days.map((d, i) => {
            let blocks = { ...d.blocks };
            if (i === fromDay) {
              blocks = {
                ...blocks,
                [fromBlock]: blocks[fromBlock].filter(
                  (p) => p.instanceId !== instanceId
                ),
              };
            }
            if (i === toDay) {
              const next = [...blocks[toBlock]];
              // if we already filtered above for same day+block, next is correct
              if (fromDay === toDay && fromBlock === toBlock) {
                // already removed; re-insert
              }
              const insertAt =
                typeof toIndex === "number"
                  ? Math.min(toIndex, next.length)
                  : next.length;
              next.splice(insertAt, 0, item);
              blocks = { ...blocks, [toBlock]: next };
            }
            return { ...d, blocks };
          }),
          intensityPreset: null,
        });
        return { ok: true };
      },

      reorderInBlock: (dayIndex, block, activeId, overId) => {
        set((state) => {
          const items = [...state.days[dayIndex].blocks[block]];
          const from = items.findIndex((p) => p.instanceId === activeId);
          const to = items.findIndex((p) => p.instanceId === overId);
          if (from < 0 || to < 0 || items[from]?.locked) return state;
          const [moved] = items.splice(from, 1);
          items.splice(to, 0, moved);
          return {
            days: state.days.map((d, i) =>
              i === dayIndex
                ? { ...d, blocks: { ...d.blocks, [block]: items } }
                : d
            ),
          };
        });
      },

      loadSample: (intensity) => {
        const sample = SAMPLE_ITINERARIES.find((s) => s.id === intensity);
        if (!sample) return;
        const dayCount = Math.max(sample.days.length, DEFAULT_DAYS);
        const days = makeDays(dayCount).map((day, i) => {
          const sampleDay = sample.days[i];
          if (!sampleDay) return day;
          return {
            ...day,
            blocks: {
              morning: sampleDay.morning.map((p) => ({
                ...p,
                instanceId: nanoid(8),
              })),
              afternoon: sampleDay.afternoon.map((p) => ({
                ...p,
                instanceId: nanoid(8),
              })),
              evening: sampleDay.evening.map((p) => ({
                ...p,
                instanceId: nanoid(8),
              })),
            },
          };
        });
        set({
          days,
          intensityPreset: intensity,
          title: `${sample.name} Badlands Retreat`,
          selectedDayIndex: 0,
          shareId: nanoid(10),
        });
      },

      clearAll: () => {
        set({
          days: makeDays(get().days.length),
          intensityPreset: null,
          title: "Custom Badlands Retreat",
          shareId: nanoid(10),
        });
      },

      loadFromShare: (payload) => {
        set({
          title: payload.title,
          days: remakeIds(payload.days),
          season: payload.season,
          intensityPreset: payload.intensityPreset,
          groupSize: payload.groupSize,
          selectedDayIndex: 0,
          shareId: nanoid(10),
        });
      },

      getEffectiveSeason: () => {
        const { season } = get();
        if (season === "auto") return detectCurrentSeason();
        return season;
      },
    }),
    {
      name: "badlands-retreat-builder",
      partialize: (state) => ({
        title: state.title,
        days: state.days,
        season: state.season,
        intensityPreset: state.intensityPreset,
        groupSize: state.groupSize,
        shareId: state.shareId,
      }),
    }
  )
);
