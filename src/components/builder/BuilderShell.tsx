"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useBuilderStore } from "@/lib/store";
import { decodeSharePayload } from "@/lib/share";
import { getActivityById } from "@/data/activities";
import { BuilderHeader } from "@/components/builder/BuilderHeader";
import { SamplePicker } from "@/components/builder/SamplePicker";
import { ActivityCatalogue } from "@/components/builder/ActivityCatalogue";
import { DayPlanner } from "@/components/builder/DayPlanner";
import { ProgressBar } from "@/components/builder/ProgressBar";
import { BadlanderChat } from "@/components/builder/BadlanderChat";
import { QuoteModal } from "@/components/builder/QuoteModal";
import { ShareModal } from "@/components/builder/ShareModal";
import { ActivityCard } from "@/components/builder/ActivityCard";
import type { TimeBlock } from "@/lib/types";

export function BuilderShell() {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    type: "catalogue" | "placed";
    activityId: string;
    instanceId?: string;
    fromDay?: number;
    fromBlock?: TimeBlock;
  } | null>(null);

  const loadFromShare = useBuilderStore((s) => s.loadFromShare);
  const addActivityToBlock = useBuilderStore((s) => s.addActivityToBlock);
  const moveActivity = useBuilderStore((s) => s.moveActivity);
  const reorderInBlock = useBuilderStore((s) => s.reorderInBlock);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    })
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("r");
    if (!token) return;
    const payload = decodeSharePayload(token);
    if (payload) {
      loadFromShare(payload);
      setToast("Shared retreat loaded — edit freely.");
    }
  }, [loadFromShare]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string) {
    setToast(msg);
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as {
      type: "catalogue" | "placed";
      activityId: string;
      instanceId?: string;
      dayIndex?: number;
      block?: TimeBlock;
    };
    setActiveDrag({
      type: data.type,
      activityId: data.activityId,
      instanceId: data.instanceId,
      fromDay: data.dayIndex,
      fromBlock: data.block,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;

    const activeData = active.data.current as {
      type: "catalogue" | "placed";
      activityId: string;
      durationMin: number;
      instanceId?: string;
      dayIndex?: number;
      block?: TimeBlock;
    };

    const overData = over.data.current as {
      type: "slot" | "placed";
      dayIndex: number;
      block: TimeBlock;
      instanceId?: string;
    };

    if (!overData?.block && overData?.type !== "placed") return;

    const toDay = overData.dayIndex;
    const toBlock = overData.block;

    if (activeData.type === "catalogue") {
      const result = addActivityToBlock(
        toDay,
        toBlock,
        activeData.activityId,
        activeData.durationMin
      );
      if (!result.ok) showToast(result.reason ?? "Couldn't place activity");
      else showToast("Activity locked into the plan");
      return;
    }

    if (activeData.type === "placed" && activeData.instanceId != null) {
      const fromDay = activeData.dayIndex!;
      const fromBlock = activeData.block!;

      if (
        fromDay === toDay &&
        fromBlock === toBlock &&
        overData.type === "placed" &&
        overData.instanceId
      ) {
        reorderInBlock(fromDay, fromBlock, activeData.instanceId, overData.instanceId);
        return;
      }

      const result = moveActivity(
        fromDay,
        fromBlock,
        toDay,
        toBlock,
        activeData.instanceId
      );
      if (!result.ok) showToast(result.reason ?? "Move blocked");
    }
  }

  const overlayActivity = activeDrag
    ? getActivityById(activeDrag.activityId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="builder-shell">
        <BuilderHeader
          onQuote={() => setQuoteOpen(true)}
          onShare={() => setShareOpen(true)}
        />
        <ProgressBar />
        <SamplePicker />

        <div className="builder-grid">
          <ActivityCatalogue />
          <DayPlanner onToast={showToast} />
        </div>

        <BadlanderChat />
        <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
        <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />

        {toast && <div className="toast">{toast}</div>}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {overlayActivity ? (
          <div className="drag-overlay">
            <ActivityCard activity={overlayActivity} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
