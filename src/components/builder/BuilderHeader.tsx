"use client";

import { Download, Share2, Send } from "lucide-react";
import { useBuilderStore } from "@/lib/store";
import { generateItineraryPdf } from "@/lib/pdf";
import { detectCurrentSeason } from "@/lib/time";

interface Props {
  onQuote: () => void;
  onShare: () => void;
}

export function BuilderHeader({ onQuote, onShare }: Props) {
  const title = useBuilderStore((s) => s.title);
  const setTitle = useBuilderStore((s) => s.setTitle);
  const days = useBuilderStore((s) => s.days);
  const groupSize = useBuilderStore((s) => s.groupSize);
  const season = useBuilderStore((s) => s.season);
  const setGroupSize = useBuilderStore((s) => s.setGroupSize);
  const setSeason = useBuilderStore((s) => s.setSeason);
  const setDayCount = useBuilderStore((s) => s.setDayCount);
  const clearAll = useBuilderStore((s) => s.clearAll);

  function handlePdf() {
    const seasonLabel =
      season === "auto" ? `Auto (${detectCurrentSeason()})` : season;
    generateItineraryPdf({
      title,
      days,
      groupSize,
      seasonLabel,
    });
  }

  return (
    <header className="builder-header">
      <div className="brand-block">
        <p className="brand-eyebrow">Badlands Bootcamp</p>
        <h1 className="brand-title">Retreat Builder</h1>
        <p className="brand-tagline">Forged in the Badlands</p>
      </div>

      <div className="header-controls">
        <label className="field">
          <span>Retreat name</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Retreat name"
          />
        </label>

        <label className="field field-sm">
          <span>Days</span>
          <select
            value={days.length}
            onChange={(e) => setDayCount(Number(e.target.value))}
          >
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-sm">
          <span>Group</span>
          <input
            type="number"
            min={1}
            max={80}
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value) || 1)}
          />
        </label>

        <label className="field field-sm">
          <span>Season</span>
          <select
            value={season}
            onChange={(e) =>
              setSeason(e.target.value as "auto" | "winter" | "summer")
            }
          >
            <option value="auto">Auto</option>
            <option value="winter">Winter</option>
            <option value="summer">Summer</option>
          </select>
        </label>
      </div>

      <div className="header-actions">
        <button type="button" className="btn-ghost" onClick={clearAll}>
          Clear
        </button>
        <button type="button" className="btn-secondary" onClick={onShare}>
          <Share2 size={16} /> Share
        </button>
        <button type="button" className="btn-secondary" onClick={handlePdf}>
          <Download size={16} /> PDF
        </button>
        <button type="button" className="btn-primary" onClick={onQuote}>
          <Send size={16} /> Request Quote
        </button>
      </div>
    </header>
  );
}
