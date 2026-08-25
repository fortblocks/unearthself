"use client";

import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, Clock, Users } from "lucide-react";
import type { Activity } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/cn";

interface Props {
  activity: Activity;
  draggable?: boolean;
  greyed?: boolean;
  groupSize?: number;
  overlay?: boolean;
}

export function ActivityCard({
  activity,
  draggable = false,
  greyed = false,
  groupSize,
  overlay = false,
}: Props) {
  const meta = CATEGORY_META[activity.category];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: overlay ? `overlay-${activity.id}` : `catalogue-${activity.id}`,
    data: {
      type: "catalogue" as const,
      activityId: activity.id,
      durationMin: activity.durationMin,
    },
    disabled: !draggable || overlay,
  });

  const overCapacity =
    activity.maxCapacity != null &&
    groupSize != null &&
    groupSize > activity.maxCapacity;

  return (
    <article
      ref={draggable && !overlay ? setNodeRef : undefined}
      className={cn(
        "activity-card",
        greyed && "is-greyed",
        isDragging && "is-dragging",
        overlay && "is-overlay"
      )}
      style={{
        ["--cat-color" as string]: meta.color,
        ["--cat-bg" as string]: meta.bg,
        ["--cat-border" as string]: meta.border,
      }}
      {...(draggable && !overlay ? { ...listeners, ...attributes } : {})}
    >
      <div className="activity-card-top">
        <span className="cat-pill">{meta.label}</span>
        {activity.season !== "year-round" && (
          <span className="season-pill">{activity.season}</span>
        )}
      </div>
      <h3>{activity.name}</h3>
      <p className="activity-vibe">{activity.vibe}</p>
      <div className="activity-meta">
        <span>
          <Clock size={13} /> {formatDuration(activity.durationMin)}
        </span>
        {activity.maxCapacity != null && (
          <span>
            <Users size={13} /> Max {activity.maxCapacity}
          </span>
        )}
      </div>
      {overCapacity && (
        <p className="capacity-warn">
          <AlertTriangle size={13} /> Max {activity.maxCapacity} people for{" "}
          {activity.name.split(" ")[0].toLowerCase()}
        </p>
      )}
      {greyed && (
        <p className="season-warn">Out of season — still draggable if you insist.</p>
      )}
    </article>
  );
}
