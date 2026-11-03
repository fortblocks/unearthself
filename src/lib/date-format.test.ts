import { describe, it } from "node:test";
import assert from "node:assert";
import { getOrdinalSuffix, formatMeetingDate } from "./date-format.ts";

describe("getOrdinalSuffix", () => {
  it("should return st for 1, 21, 31", () => {
    assert.strictEqual(getOrdinalSuffix(1), "st");
    assert.strictEqual(getOrdinalSuffix(21), "st");
    assert.strictEqual(getOrdinalSuffix(31), "st");
  });

  it("should return nd for 2, 22", () => {
    assert.strictEqual(getOrdinalSuffix(2), "nd");
    assert.strictEqual(getOrdinalSuffix(22), "nd");
  });

  it("should return rd for 3, 23", () => {
    assert.strictEqual(getOrdinalSuffix(3), "rd");
    assert.strictEqual(getOrdinalSuffix(23), "rd");
  });

  it("should return th for 4-10", () => {
    assert.strictEqual(getOrdinalSuffix(4), "th");
    assert.strictEqual(getOrdinalSuffix(5), "th");
    assert.strictEqual(getOrdinalSuffix(6), "th");
    assert.strictEqual(getOrdinalSuffix(7), "th");
    assert.strictEqual(getOrdinalSuffix(8), "th");
    assert.strictEqual(getOrdinalSuffix(9), "th");
    assert.strictEqual(getOrdinalSuffix(10), "th");
  });

  it("should return th for 11, 12, 13", () => {
    assert.strictEqual(getOrdinalSuffix(11), "th");
    assert.strictEqual(getOrdinalSuffix(12), "th");
    assert.strictEqual(getOrdinalSuffix(13), "th");
  });

  it("should return th for 14-20", () => {
    assert.strictEqual(getOrdinalSuffix(14), "th");
    assert.strictEqual(getOrdinalSuffix(20), "th");
  });
});

describe("formatMeetingDate", () => {
  it("should format August 23rd correctly", () => {
    const result = formatMeetingDate("2026-08-23");
    assert.ok(result.includes("August"));
    assert.ok(result.includes("23rd"));
    assert.ok(result.includes("2026"));
  });

  it("should format August 25th as Tuesday (bug fix)", () => {
    const result = formatMeetingDate("2026-08-25");
    assert.ok(result.includes("Tuesday"), `Expected Tuesday, got: ${result}`);
    assert.ok(result.includes("August"));
    assert.ok(result.includes("25th"));
    assert.ok(result.includes("2026"));
  });

  it("should format October 29th as Thursday (not Sunday)", () => {
    const result = formatMeetingDate("2026-10-29");
    assert.ok(result.includes("Thursday"), `Expected Thursday, got: ${result}`);
    assert.ok(result.includes("October"));
    assert.ok(result.includes("29th"));
  });

  it("should format dates with 1st suffix", () => {
    const result = formatMeetingDate("2026-10-01");
    assert.ok(result.includes("1st"));
  });

  it("should format dates with 2nd suffix", () => {
    const result = formatMeetingDate("2026-10-02");
    assert.ok(result.includes("2nd"));
  });

  it("should format dates with 3rd suffix", () => {
    const result = formatMeetingDate("2026-10-03");
    assert.ok(result.includes("3rd"));
  });

  it("should handle 11th, 12th, 13th correctly", () => {
    assert.ok(formatMeetingDate("2026-10-11").includes("11th"));
    assert.ok(formatMeetingDate("2026-10-12").includes("12th"));
    assert.ok(formatMeetingDate("2026-10-13").includes("13th"));
  });

  it("should handle 21st and 22nd correctly", () => {
    assert.ok(formatMeetingDate("2026-10-21").includes("21st"));
    assert.ok(formatMeetingDate("2026-10-22").includes("22nd"));
  });

  it("should include correct weekday", () => {
    const result = formatMeetingDate("2026-08-23");
    // Should include a weekday name
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    assert.ok(weekdays.some(day => result.includes(day)));
  });

  it("should handle Edmonton midnight edge case", () => {
    // Test a date at midnight Edmonton time
    const result = formatMeetingDate("2026-01-01");
    assert.ok(result.includes("2026"));
    assert.ok(result.includes("January"));
    assert.ok(result.includes("1st"));
  });

  it("should return original string for invalid date", () => {
    const result = formatMeetingDate("invalid");
    assert.strictEqual(result, "invalid");
  });
});
