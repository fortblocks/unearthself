"use client";

import { Search } from "lucide-react";
import { ACTIVITIES } from "@/data/activities";
import { useBuilderStore } from "@/lib/store";
import {
  CATEGORY_META,
  type ActivityCategory,
} from "@/lib/types";
import { detectCurrentSeason } from "@/lib/time";
import { ActivityCard } from "@/components/builder/ActivityCard";

const CATEGORIES: Array<ActivityCategory | "all"> = [
  "all",
  "recovery",
  "outdoor",
  "mind-body",
  "team",
  "cultural",
  "seasonal",
];

export function ActivityCatalogue() {
  const query = useBuilderStore((s) => s.catalogueQuery);
  const category = useBuilderStore((s) => s.catalogueCategory);
  const setQuery = useBuilderStore((s) => s.setCatalogueQuery);
  const setCategory = useBuilderStore((s) => s.setCatalogueCategory);
  const season = useBuilderStore((s) => s.season);
  const groupSize = useBuilderStore((s) => s.groupSize);

  const effectiveSeason =
    season === "auto" ? detectCurrentSeason() : season;

  const filtered = ACTIVITIES.filter((a) => {
    if (category !== "all" && a.category !== category) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some((t) => t.includes(q))
    );
  });

  return (
    <aside className="catalogue">
      <div className="catalogue-head">
        <h2>Activity Catalogue</h2>
        <p>Drag into morning, afternoon, or evening slots.</p>
      </div>

      <div className="search-wrap">
        <Search size={16} aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search activities…"
          aria-label="Search activities"
        />
      </div>

      <div className="category-chips" role="tablist" aria-label="Categories">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            className={`chip ${category === c ? "is-active" : ""}`}
            style={
              c !== "all"
                ? {
                    ["--chip-color" as string]: CATEGORY_META[c].color,
                  }
                : undefined
            }
            onClick={() => setCategory(c)}
          >
            {c === "all" ? "All" : CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      <div className="catalogue-list">
        {filtered.map((activity) => {
          const outOfSeason =
            activity.season !== "year-round" &&
            activity.season !== effectiveSeason;
          return (
            <ActivityCard
              key={activity.id}
              activity={activity}
              draggable
              greyed={outOfSeason}
              groupSize={groupSize}
            />
          );
        })}
        {filtered.length === 0 && (
          <p className="empty-hint">No activities match that hunt.</p>
        )}
      </div>
    </aside>
  );
}
