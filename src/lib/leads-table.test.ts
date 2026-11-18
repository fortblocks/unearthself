import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LEAD_SORT, nextLeadSort, sizeLowerBound, sortLeadRows, type LeadSortKey } from "./leads-table.ts";

function row(id: string, org: string, place: string, sizeBand: string, total: number, city = place) {
  return { company: { id, org, city, place, sizeBand }, score: { total } };
}

const rows = [
  row("C-2", "NuVista Energy", "Calgary", "80-800", 70),
  row("C-1", "Peyto", "Edmonton", "1-49", 90),
  row("C-3", "Headwater", "", "1500+", 50, "Red Deer"),
  row("C-4", "Acme", "Calgary", "unknown", 90),
  row("C-5", "Range", "Denver", "801-1500", 60),
];

test("default order is score descending, and score sorts both ways", () => {
  assert.deepEqual(DEFAULT_LEAD_SORT, { key: "score", dir: "desc" });
  assert.deepEqual(
    sortLeadRows(rows, DEFAULT_LEAD_SORT).map((item) => item.company.id),
    ["C-4", "C-1", "C-2", "C-5", "C-3"],
  );
  assert.deepEqual(
    sortLeadRows(rows, { key: "score", dir: "asc" }).map((item) => item.company.id),
    ["C-3", "C-5", "C-2", "C-4", "C-1"],
  );
});

test("company and place sort alphabetically both ways", () => {
  assert.deepEqual(
    sortLeadRows(rows, { key: "company", dir: "asc" }).map((item) => item.company.org),
    ["Acme", "Headwater", "NuVista Energy", "Peyto", "Range"],
  );
  assert.deepEqual(
    sortLeadRows(rows, { key: "company", dir: "desc" }).map((item) => item.company.org),
    ["Range", "Peyto", "NuVista Energy", "Headwater", "Acme"],
  );
  assert.deepEqual(
    sortLeadRows(rows, { key: "place", dir: "asc" }).map((item) => item.company.id),
    ["C-4", "C-2", "C-5", "C-1", "C-3"],
  );
  assert.deepEqual(
    sortLeadRows(rows, { key: "place", dir: "desc" }).map((item) => item.company.id),
    ["C-3", "C-1", "C-5", "C-4", "C-2"],
  );
});

test("size sorts by the lower bound of the headcount range, both ways", () => {
  assert.equal(sizeLowerBound("1-49"), 1);
  assert.equal(sizeLowerBound("50-79"), 50);
  assert.equal(sizeLowerBound("80-800"), 80);
  assert.equal(sizeLowerBound("801-1500"), 801);
  assert.equal(sizeLowerBound("1500+"), 1500);
  assert.equal(sizeLowerBound("unknown"), null);
  assert.deepEqual(
    sortLeadRows(rows, { key: "size", dir: "asc" }).map((item) => item.company.sizeBand),
    ["1-49", "80-800", "801-1500", "1500+", "unknown"],
  );
  assert.deepEqual(
    sortLeadRows(rows, { key: "size", dir: "desc" }).map((item) => item.company.sizeBand),
    ["1500+", "801-1500", "80-800", "1-49", "unknown"],
  );
});

test("a header click flips the active column and a new column starts in its natural direction", () => {
  let sort = DEFAULT_LEAD_SORT;
  sort = nextLeadSort(sort, "score");
  assert.deepEqual(sort, { key: "score", dir: "asc" });
  sort = nextLeadSort(sort, "score");
  assert.deepEqual(sort, { key: "score", dir: "desc" });
  const first: Record<LeadSortKey, "asc" | "desc"> = {
    company: "asc",
    place: "asc",
    size: "desc",
    score: "desc",
  };
  for (const key of ["company", "place", "size", "score"] as const) {
    const opened = nextLeadSort(DEFAULT_LEAD_SORT, key);
    assert.equal(opened.key, key);
    assert.equal(opened.dir, key === "score" ? "asc" : first[key]);
    assert.equal(nextLeadSort(opened, key).dir, opened.dir === "asc" ? "desc" : "asc");
  }
});

test("sort orders only the rows it is given, so a source filter can run first", () => {
  const hunter = rows.filter((item) => item.company.id === "C-1" || item.company.id === "C-3");
  assert.deepEqual(
    sortLeadRows(hunter, DEFAULT_LEAD_SORT).map((item) => item.company.id),
    ["C-1", "C-3"],
  );
});
