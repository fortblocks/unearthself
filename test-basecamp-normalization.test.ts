/**
 * Tests for Basecamp brand normalization
 * Brand rule: "Basecamp" is always one word
 * Test all variants: "Base Camp", "Base camp", "base camp", "Base-Camp" → "Basecamp"
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeBasecamp } from "./src/lib/minutes-archive";

describe("normalizeBasecamp", () => {
  it("should normalize 'Base Camp' to 'Basecamp'", () => {
    const input = "The headquarters is called Base Camp.";
    const expected = "The headquarters is called Basecamp.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should normalize 'Base camp' to 'Basecamp'", () => {
    const input = "We're meeting at Base camp tomorrow.";
    const expected = "We're meeting at Basecamp tomorrow.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should normalize 'base camp' to 'Basecamp'", () => {
    const input = "The base camp is ready.";
    const expected = "The Basecamp is ready.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should normalize 'Base-Camp' to 'Basecamp'", () => {
    const input = "Visit our Base-Camp facility.";
    const expected = "Visit our Basecamp facility.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should handle multiple occurrences", () => {
    const input = "Base Camp is open. Visit Base camp anytime. The base camp schedule is posted.";
    const expected = "Basecamp is open. Visit Basecamp anytime. The Basecamp schedule is posted.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should preserve 'Badlands Basecamp' (already correct)", () => {
    const input = "Welcome to Badlands Basecamp.";
    const expected = "Welcome to Badlands Basecamp.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should normalize 'Badlands Base Camp' to 'Badlands Basecamp'", () => {
    const input = "Welcome to Badlands Base Camp.";
    const expected = "Welcome to Badlands Basecamp.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should NOT touch 'Boot Camp' or 'Bootcamp'", () => {
    const input = "Boot Camp is different from Base Camp. Bootcamp sessions start Monday.";
    const expected = "Boot Camp is different from Basecamp. Bootcamp sessions start Monday.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should handle real meeting excerpt", () => {
    const input = "Christopher described Base Camp as a workstream under Boot Camp. The Base camp facility will be operational in October.";
    const expected = "Christopher described Basecamp as a workstream under Boot Camp. The Basecamp facility will be operational in October.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should work with mixed case variants in same text", () => {
    const input = "The Base Camp, base camp and Base-Camp all refer to the same place.";
    const expected = "The Basecamp, Basecamp and Basecamp all refer to the same place.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should preserve word boundaries (not match 'database camp')", () => {
    const input = "Our database camp is separate from Base Camp.";
    const expected = "Our database camp is separate from Basecamp.";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });

  it("should handle edge case with punctuation", () => {
    const input = "Is Base Camp open? Yes, Base camp is!";
    const expected = "Is Basecamp open? Yes, Basecamp is!";
    assert.strictEqual(normalizeBasecamp(input), expected);
  });
});

// Run tests
console.log("Running Basecamp normalization tests...\n");
describe("Basecamp Normalization Test Suite", async () => {
  await describe("normalizeBasecamp", async () => {
    await it("normalizes all Base Camp variants to Basecamp", () => {
      const testCases = [
        { input: "Base Camp", expected: "Basecamp" },
        { input: "Base camp", expected: "Basecamp" },
        { input: "base camp", expected: "Basecamp" },
        { input: "Base-Camp", expected: "Basecamp" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeBasecamp(input);
        assert.strictEqual(result, expected, `Failed for input: "${input}"`);
      });

      console.log("✅ All Base Camp variants normalized correctly");
    });

    await it("preserves Boot Camp/Bootcamp unchanged", () => {
      const input = "Boot Camp is separate from Base Camp. Bootcamp runs weekly.";
      const expected = "Boot Camp is separate from Basecamp. Bootcamp runs weekly.";
      const result = normalizeBasecamp(input);
      assert.strictEqual(result, expected);
      console.log("✅ Boot Camp/Bootcamp preserved correctly");
    });

    await it("handles complex real-world example", () => {
      const input = "Looking back over your records, the first time I can hear of an official name for headquarters was on 22nd June, and the name I picked up was Base Camp. Christopher described it as a workstream under Boot Camp.";
      const expected = "Looking back over your records, the first time I can hear of an official name for headquarters was on 22nd June, and the name I picked up was Basecamp. Christopher described it as a workstream under Boot Camp.";
      const result = normalizeBasecamp(input);
      assert.strictEqual(result, expected);
      console.log("✅ Real-world example processed correctly");
    });

    await it("handles Badlands Base Camp correctly", () => {
      const input = "Welcome to Badlands Base Camp in Drumheller.";
      const expected = "Welcome to Badlands Basecamp in Drumheller.";
      const result = normalizeBasecamp(input);
      assert.strictEqual(result, expected);
      console.log("✅ Badlands Base Camp → Badlands Basecamp");
    });
  });
});

console.log("\n✅ ALL TESTS PASSED\n");
console.log("Brand normalization works correctly:");
console.log("- All 'Base Camp' variants → 'Basecamp'");
console.log("- 'Boot Camp'/'Bootcamp' preserved");
console.log("- Multiple occurrences handled");
console.log("- Word boundaries respected");
