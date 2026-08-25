"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Lock, LockOpen, Trash2, AlertTriangle } from "lucide-react";
import { getActivityById } from "@/data/activities";
import { useBuilderStore } from "@/lib/store";
import {
  BLOCK_META,
  CATEGORY_META,
  TRANSFER_BUFFER_MIN,
  type TimeBlock,
} from "@/lib/types";
import {
  blockRemainingMinutes,
  blockUsedMinutes,
  capacityWarning,
  formatDuration,
} from "@/lib/time";
import { cn } from "@/lib/cn";

interface Props {
  onToast: (msg: string) => void;
}

export function DayPlanner({ onToast }: Props) {
  const days = useBuilderStore((s) => s.days);
  const selectedDayIndex = useBuilderStore((s) => s.selectedDayIndex);
  const setSelectedDayIndex = useBuilderStore((s) => s.setSelectedDayIndex);

  const day = days[selectedDayIndex];
  const blocks: TimeBlock[] = ["morning", "afternoon", "evening"];

  return (
    <section className="planner">
      <div className="planner-head">
        <h2>Multi-Day Planner</h2>
        <p>
          {TRANSFER_BUFFER_MIN} min transfer buffers auto-insert between
          activities. Don&apos;t overbook the canyon.
        </p>
      </div>

      <div className="day-tabs" role="tablist">
        {days.map((d, i) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={i === selectedDayIndex}
            className={cn("day-tab", i === selectedDayIndex && "is-active")}
            onClick={() => setSelectedDayIndex(i)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {day && (
        <div className="block-grid">
          {blocks.map((block) => (
            <TimeSlotColumn
              key={`${day.id}-${block}`}
              dayIndex={selectedDayIndex}
              block={block}
              onToast={onToast}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TimeSlotColumn({
  dayIndex,
  block,
  onToast,
}: {
  dayIndex: number;
  block: TimeBlock;
  onToast: (msg: string) => void;
}) {
  const items = useBuilderStore((s) => s.days[dayIndex].blocks[block]);
  const removeActivity = useBuilderStore((s) => s.removeActivity);
  const toggleLock = useBuilderStore((s) => s.toggleLock);
  const groupSize = useBuilderStore((s) => s.groupSize);

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${dayIndex}-${block}`,
    data: { type: "slot" as const, dayIndex, block },
  });

  const used = blockUsedMinutes(items);
  const remaining = blockRemainingMinutes(items, block);
  const capacity = BLOCK_META[block].capacityMin;
  const pct = Math.min(100, Math.round((used / capacity) * 100));

  return (
    <div
      ref={setNodeRef}
      className={cn("time-slot", isOver && "is-over")}
    >
      <div className="time-slot-head">
        <div>
          <h3>{BLOCK_META[block].label}</h3>
          <span>{BLOCK_META[block].window}</span>
        </div>
        <div className="time-remaining">
          <strong>{formatDuration(Math.max(0, remaining))}</strong>
          <span>left</span>
        </div>
      </div>

      <div className="slot-meter">
        <div
          className={cn("slot-meter-fill", remaining < 0 && "is-overbooked")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <SortableContext
        items={items.map((i) => i.instanceId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="slot-items">
          {items.length === 0 && (
            <div className="slot-empty">Drop an activity here</div>
          )}
          {items.map((item, idx) => {
            const activity = getActivityById(item.activityId);
            const warn = capacityWarning(item.activityId, groupSize);
            return (
              <div key={item.instanceId}>
                <PlacedCard
                  instanceId={item.instanceId}
                  activityId={item.activityId}
                  durationMin={item.durationMin}
                  locked={item.locked}
                  dayIndex={dayIndex}
                  block={block}
                  name={activity?.name ?? item.activityId}
                  category={activity?.category}
                  warning={warn}
                  onRemove={() => {
                    if (item.locked) {
                      onToast("Unlock before removing.");
                      return;
                    }
                    removeActivity(dayIndex, block, item.instanceId);
                  }}
                  onToggleLock={() =>
                    toggleLock(dayIndex, block, item.instanceId)
                  }
                />
                {idx < items.length - 1 && (
                  <div className="transfer-chip">
                    +{TRANSFER_BUFFER_MIN} min transfer
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}

function PlacedCard({
  instanceId,
  activityId,
  durationMin,
  locked,
  dayIndex,
  block,
  name,
  category,
  warning,
  onRemove,
  onToggleLock,
}: {
  instanceId: string;
  activityId: string;
  durationMin: number;
  locked: boolean;
  dayIndex: number;
  block: TimeBlock;
  name: string;
  category?: keyof typeof CATEGORY_META;
  warning: string | null;
  onRemove: () => void;
  onToggleLock: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: instanceId,
      data: {
        type: "placed" as const,
        activityId,
        durationMin,
        instanceId,
        dayIndex,
        block,
      },
      disabled: locked,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ["--cat-color" as string]: category
      ? CATEGORY_META[category].color
      : "#D97706",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("placed-card", isDragging && "is-dragging", locked && "is-locked")}
    >
      <button
        type="button"
        className="placed-handle"
        {...listeners}
        {...attributes}
        aria-label={`Drag ${name}`}
        disabled={locked}
      >
        <span className="placed-name">{name}</span>
        <span className="placed-dur">{formatDuration(durationMin)}</span>
      </button>
      {warning && (
        <p className="capacity-warn compact">
          <AlertTriangle size={12} /> {warning}
        </p>
      )}
      <div className="placed-actions">
        <button
          type="button"
          onClick={onToggleLock}
          aria-label={locked ? "Unlock" : "Lock"}
          title={locked ? "Unlock slot" : "Lock slot"}
        >
          {locked ? <Lock size={14} /> : <LockOpen size={14} />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
