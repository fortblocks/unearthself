import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MENU_NOTE, PLACE_HEADLINE, PLACE_LABEL, PLACE_PARAGRAPHS } from "./basecampCopy.ts";
import { TREATMENTS, treatmentById } from "./treatments.ts";

const PLACEHOLDER = /lorem ipsum|coming soon|add what you want|book opens the same panel|\bTODO\b/i;

const MENU = [
  ["quad-ir", "Quad infrared sauna", "40 min", 55],
  ["single-ir", "Single infrared sauna", "40 min", 55],
  ["steam", "Salt stone steam", "30 min", 55],
  ["plunge", "Cold plunge", "15 min", 40],
  ["circuit", "Fire and Ice circuit", "A set", 100],
  ["mud-bath", "Mud bath", "Bath", 65],
  ["herbal-bath", "Herbal bath", "Bath", 75],
  ["red-light", "Red light", "20 min", 20],
  ["reiki", "Reiki", "55 min", 80],
  ["lymph", "Lymphatic bodywork", "55 min", 80],
  ["stone", "Stone, hot or cool", "55 min", 90],
  ["unearthed", "Unearthed Bodyworks", "75 min", 115],
  ["exfoliation", "Full body exfoliation", "45 min", 85],
  ["herbal-wrap", "Herbal wrap", "90 min", 199],
  ["mud-wrap", "Mud wrap", "55 min", 110],
  ["seaweed", "Seaweed wrap", "55 min", 110],
  ["mud-red", "Mud and red light", "30 min", 75],
  ["facial", "Advanced facial", "55 min", 160],
  ["brow", "Brow tint", "20 min", 25],
  ["rmt", "RMT massage", "55 min", 140],
  ["sound", "Sound bath", "55 min", 250],
] as const;

test("launch menu names, times and prices stay as published", () => {
  assert.deepEqual(
    TREATMENTS.map((t) => [t.id, t.name, t.mins, t.price]),
    MENU.map((row) => [...row]),
  );
});

test("treatment pages have no invented descriptions or placeholder copy", () => {
  for (const treatment of TREATMENTS) {
    assert.equal(treatment.description, undefined);
    assert.equal(treatmentById(treatment.id), treatment);
    assert.match(treatment.id, /^[a-z0-9-]+$/);
    assert.doesNotMatch(treatment.name, PLACEHOLDER);
    assert.doesNotMatch(treatment.line, PLACEHOLDER);
    assert.ok(treatment.line.trim().length > 0);
  }
  assert.equal(treatmentById("missing"), undefined);
});

test("Norah's Basecamp opening and menu line are the public words", () => {
  assert.equal(PLACE_LABEL, "The place");
  assert.equal(PLACE_HEADLINE, "Check in. Exhale. Come back to yourself.");
  assert.equal(
    MENU_NOTE,
    "Prices in CAD. Select from massage therapy to healing work, weight loss and nervous system quieting.",
  );
  const opening = PLACE_PARAGRAPHS.join("\n");
  assert.match(opening, /^Basecamp brings boutique hotel comfort/);
  assert.match(opening, /as an intriguing journey to wellness/);
  assert.match(opening, /The Haven’s thoughtfully appointed suites/);
  assert.doesNotMatch(opening, /Base Camp/);
  assert.doesNotMatch(opening, /a intriguing/);
  assert.doesNotMatch(`${PLACE_LABEL}\n${PLACE_HEADLINE}\n${opening}\n${MENU_NOTE}`, PLACEHOLDER);

  const book = readFileSync(new URL("../components/basecamp/TreatmentBook.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../components/basecamp/TreatmentDetail.tsx", import.meta.url), "utf8");
  assert.match(book, /Not a gym floor with a candle/);
  assert.match(book, /Fire and Ice for sauna, steam and plunge/);
  assert.match(book, /We keep the diaries/);
  assert.doesNotMatch(book, /Come in from/);
  assert.doesNotMatch(book, PLACEHOLDER);
  assert.doesNotMatch(detail, PLACEHOLDER);
  assert.doesNotMatch(detail, /description coming soon|Read more about/i);
});
