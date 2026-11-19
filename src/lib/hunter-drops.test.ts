import assert from "node:assert/strict";
import test from "node:test";
import { DROP_REASONS, emptyFunnel, type DropReason } from "./hunter-phase.ts";
import { DROP_LABELS, formatFunnelDrops } from "./hunter-drops.ts";

test("every drop reason has one plain label", () => {
  assert.deepEqual(Object.keys(DROP_LABELS).sort(), [...DROP_REASONS].sort());
  for (const reason of DROP_REASONS) {
    assert.ok(DROP_LABELS[reason].length > 0);
    assert.equal(DROP_LABELS[reason].includes("\u2014"), false);
  }
});

test("formats non-zero drops in reason order with plain labels", () => {
  const funnel = emptyFunnel();
  funnel.drops["no-mx"] = 2;
  funnel.drops.duplicate = 4;
  funnel.drops["page-empty"] = 0;
  assert.equal(
    formatFunnelDrops(funnel),
    "Dropped: 4 already in the book (duplicate), 2 no MX record",
  );
});

test("a funnel with no drops says so", () => {
  assert.equal(formatFunnelDrops(emptyFunnel()), "No drops recorded");
  assert.equal(formatFunnelDrops({ drops: {} }), "No drops recorded");
});

test("an older record with no funnel adds nothing", () => {
  assert.equal(formatFunnelDrops(null), null);
  assert.equal(formatFunnelDrops(undefined), null);
});

test("each reason uses its own label and a zero count stays hidden", () => {
  for (const reason of DROP_REASONS) {
    const other: DropReason = reason === "duplicate" ? "no-mx" : "duplicate";
    const drops: Partial<Record<DropReason, number>> = { [reason]: 1, [other]: 0 };
    assert.equal(formatFunnelDrops({ drops }), `Dropped: 1 ${DROP_LABELS[reason]}`);
  }
});
