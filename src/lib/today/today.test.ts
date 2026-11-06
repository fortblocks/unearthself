/**
 * Today section sources. Imports the production fetchers. Does not copy them.
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fetchArrivals, sampleArrivals } from "./sources/arrivals.ts";
import { leadDirection, sampleLeads } from "./sources/leads.ts";
import { fetchMeetingList } from "./sources/minutes.ts";
import { displayShiftName, sampleShifts } from "./sources/shifts.ts";
import { fetchStats } from "./sources/stats.ts";
import { sectionSources } from "./registry.ts";
import { loadIndependent } from "./load.ts";

test("registry keeps desk sections on sample and actions on live", () => {
  assert.equal(sectionSources.arrivals, "sample");
  assert.equal(sectionSources.diary, "sample");
  assert.equal(sectionSources.shifts, "sample");
  assert.equal(sectionSources.programme, "sample");
  assert.equal(sectionSources.leads, "sample");
  assert.equal(sectionSources.needsHuman, "sample");
  assert.equal(sectionSources.stats, "sample");
  assert.equal(sectionSources.minutes, "live");
  assert.equal(sectionSources.actions, "live");
});

test("sample arrivals come from the desk book and live arrivals do not", async () => {
  const sample = await fetchArrivals("sample");
  assert.equal(sample.ok, true);
  if (sample.ok) {
    assert.equal(sample.mode, "sample");
    assert.deepEqual(sample.data, sampleArrivals());
    assert.ok(sample.data.some((row) => row.state === "in"));
  }
  const live = await fetchArrivals("live");
  assert.equal(live.ok, false);
  if (!live.ok) {
    assert.equal(live.mode, "live");
    assert.doesNotMatch(live.error, /Apex|Cole|Benson|Holt/);
  }
});

test("leads split inbound and outbound by source, partners by first name", () => {
  assert.equal(leadDirection("scout"), "outbound");
  assert.equal(leadDirection("web"), "inbound");
  assert.equal(leadDirection("direct"), "inbound");
  const leads = sampleLeads();
  assert.ok(leads.some((lead) => lead.direction === "outbound" && lead.org === "Northwind Logistics"));
  assert.ok(leads.some((lead) => lead.direction === "inbound"));
  assert.ok(leads.every((lead) => ["Lisa", "Tess", "Norah", "Christopher"].includes(lead.owner)));
});

test("shift names use partner first names", () => {
  assert.equal(displayShiftName("Lisa Hamilton"), "Lisa");
  assert.equal(displayShiftName("Darcie"), "Darcie");
  const shifts = sampleShifts();
  assert.ok(shifts.some((shift) => shift.name === "Lisa"));
  assert.equal(shifts.some((shift) => shift.name.includes("Hamilton")), false);
});

test("sample stats count the sample book", async () => {
  const stats = await fetchStats("sample");
  assert.equal(stats.ok, true);
  if (stats.ok) {
    assert.equal(stats.mode, "sample");
    assert.match(stats.data.inHouse, /\/ 4$/);
    assert.equal(stats.data.treatments, "3");
  }
  const live = await fetchStats("live");
  assert.equal(live.ok, false);
});

test("a thrown minutes list does not reject the section loader", async () => {
  const result = await fetchMeetingList("live", async () => {
    throw new Error("drive down");
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /drive down/);
});

test("one failing section does not drop the others", async () => {
  const loaded = await loadIndependent({
    arrivals: async () => ({ ok: true as const, mode: "sample" as const, data: ["Elowen"] }),
    diary: async () => {
      throw new Error("diary down");
    },
  });
  assert.equal(loaded.arrivals.ok, true);
  assert.equal(loaded.diary.ok, false);
  if (!loaded.diary.ok) assert.match(loaded.diary.error, /diary down/);
});
