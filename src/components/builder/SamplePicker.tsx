"use client";

import { SAMPLE_ITINERARIES } from "@/data/samples";
import { useBuilderStore } from "@/lib/store";
import type { Intensity } from "@/lib/types";

export function SamplePicker() {
  const loadSample = useBuilderStore((s) => s.loadSample);
  const intensityPreset = useBuilderStore((s) => s.intensityPreset);

  return (
    <section className="sample-picker">
      <div className="sample-intro">
        <h2>Start forged</h2>
        <p>Load a sample itinerary, then drag it into your own shape.</p>
      </div>
      <div className="sample-grid">
        {SAMPLE_ITINERARIES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className={`sample-card ${
              intensityPreset === sample.id ? "is-active" : ""
            }`}
            onClick={() => loadSample(sample.id as Intensity)}
          >
            <span className="sample-name">{sample.name}</span>
            <span className="sample-tagline">{sample.tagline}</span>
            <span className="sample-desc">{sample.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
