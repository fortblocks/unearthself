"use client";

import { useMemo, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { useBuilderStore } from "@/lib/store";
import { buildShareUrl } from "@/lib/share";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ open, onClose }: Props) {
  const title = useBuilderStore((s) => s.title);
  const days = useBuilderStore((s) => s.days);
  const season = useBuilderStore((s) => s.season);
  const intensityPreset = useBuilderStore((s) => s.intensityPreset);
  const groupSize = useBuilderStore((s) => s.groupSize);
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    if (!open || typeof window === "undefined") return "";
    return buildShareUrl({
      v: 1,
      title,
      days,
      season,
      intensityPreset,
      groupSize,
    });
  }, [open, title, days, season, intensityPreset, groupSize]);

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.getElementById(
        "share-url-input"
      ) as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal-sm"
        role="dialog"
        aria-label="Share retreat"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <p className="modal-eyebrow">Unique link</p>
            <h2>Share this retreat</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <p className="share-copy">
          Anyone with this link can open your custom itinerary and keep editing.
        </p>
        <div className="share-row">
          <input id="share-url-input" readOnly value={url} />
          <button type="button" className="btn-primary" onClick={() => void copy()}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
