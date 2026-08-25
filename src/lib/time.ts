import {
  BLOCK_META,
  TRANSFER_BUFFER_MIN,
  type DayPlan,
  type PlacedActivity,
  type Season,
  type TimeBlock,
} from "@/lib/types";
import { getActivityById } from "@/data/activities";

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hr${h === 1 ? "" : "s"}`;
  return `${h}h ${m}m`;
}

export function blockUsedMinutes(items: PlacedActivity[]): number {
  if (items.length === 0) return 0;
  const activityTime = items.reduce((sum, item) => sum + item.durationMin, 0);
  const buffers = Math.max(0, items.length - 1) * TRANSFER_BUFFER_MIN;
  return activityTime + buffers;
}

export function blockRemainingMinutes(
  items: PlacedActivity[],
  block: TimeBlock
): number {
  return BLOCK_META[block].capacityMin - blockUsedMinutes(items);
}

export function canFitActivity(
  items: PlacedActivity[],
  block: TimeBlock,
  durationMin: number
): boolean {
  const extraBuffer = items.length > 0 ? TRANSFER_BUFFER_MIN : 0;
  return blockRemainingMinutes(items, block) >= durationMin + extraBuffer;
}

export function dayUsedMinutes(day: DayPlan): number {
  return (Object.keys(day.blocks) as TimeBlock[]).reduce(
    (sum, block) => sum + blockUsedMinutes(day.blocks[block]),
    0
  );
}

export function dayCapacityMinutes(): number {
  return (Object.keys(BLOCK_META) as TimeBlock[]).reduce(
    (sum, block) => sum + BLOCK_META[block].capacityMin,
    0
  );
}

export function retreatCompletion(days: DayPlan[]): number {
  if (days.length === 0) return 0;
  const scores = days.map((day) => {
    const blocks = Object.keys(day.blocks) as TimeBlock[];
    const filled = blocks.filter((b) => day.blocks[b].length > 0).length;
    return filled / blocks.length;
  });
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
}

export function detectCurrentSeason(date = new Date()): Season {
  const month = date.getMonth() + 1;
  // Alberta: winter roughly Nov–Mar
  if (month >= 11 || month <= 3) return "winter";
  return "summer";
}

export function isActivityAvailable(
  seasonFilter: Season | "auto",
  activitySeason: Season,
  currentSeason: Season
): boolean {
  if (activitySeason === "year-round") return true;
  const effective = seasonFilter === "auto" ? currentSeason : seasonFilter;
  return activitySeason === effective;
}

export function capacityWarning(
  activityId: string,
  groupSize: number
): string | null {
  const activity = getActivityById(activityId);
  if (!activity?.maxCapacity) return null;
  if (groupSize > activity.maxCapacity) {
    return `Max ${activity.maxCapacity} people for ${activity.name}`;
  }
  return null;
}

export function createEmptyDay(index: number): DayPlan {
  return {
    id: `day-${index + 1}-${Date.now()}`,
    label: `Day ${index + 1}`,
    blocks: {
      morning: [],
      afternoon: [],
      evening: [],
    },
  };
}

export function clonePlaced(items: PlacedActivity[]): PlacedActivity[] {
  return items.map((item) => ({
    ...item,
    instanceId: `${item.instanceId}-${Math.random().toString(36).slice(2, 6)}`,
  }));
}
