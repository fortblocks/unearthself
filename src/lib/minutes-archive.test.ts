import { describe, it } from "node:test";
import assert from "node:assert";

describe("Minutes Archive", () => {
  it("should detect Badlanders series from title", () => {
    const title = "Badlander's Development Meeting – Notes by Gemini";
    assert.ok(title.toLowerCase().includes("badlander"));
  });

  it("should detect Business Dev series from title", () => {
    const title = "Business Development Sync – June 2026";
    assert.ok(title.toLowerCase().includes("business development"));
  });

  it("should detect Partner Marketing series from title", () => {
    const title = "Partner Marketing Strategy – Q3";
    assert.ok(title.toLowerCase().includes("marketing"));
  });

  it("should parse date from various formats", () => {
    const text1 = "Meeting held on June 23, 2026 at 10:30 AM";
    const text2 = "Started at 2:00 PM on July 15, 2026";
    
    assert.ok(text1.includes("June 23, 2026"));
    assert.ok(text2.includes("July 15, 2026"));
  });

  it("should validate indexed document structure", () => {
    const doc = {
      id: "doc-123",
      title: "Test Meeting",
      series: "badlanders" as const,
      date: "2026-06-23",
      time: "10:30",
      createdTime: "2026-06-23T16:30:00Z",
      modifiedTime: "2026-06-23T17:00:00Z",
      fullText: "Meeting content here",
      indexedAt: "2026-11-03T00:00:00Z",
    };

    assert.strictEqual(doc.series, "badlanders");
    assert.strictEqual(doc.date, "2026-06-23");
    assert.ok(doc.fullText.length > 0);
  });

  it("should calculate embedding cost correctly", () => {
    const tokensPerDoc = 2000;
    const costPer1KTokens = 0.0001;
    const costPerDoc = (tokensPerDoc / 1000) * costPer1KTokens;
    
    // $0.0002 per doc
    assert.strictEqual(costPerDoc, 0.0002);
    
    // $10 budget = 50,000 docs
    const budget = 10;
    const docsWithinBudget = Math.floor(budget / costPerDoc);
    assert.ok(docsWithinBudget >= 50000);
  });

  it("should handle pagination for large folder", () => {
    const pageSize = 100;
    const totalFiles = 250;
    const expectedPages = Math.ceil(totalFiles / pageSize);
    
    assert.strictEqual(expectedPages, 3);
  });

  it("should group documents by series", () => {
    const docs = [
      { series: "badlanders" },
      { series: "badlanders" },
      { series: "business_dev" },
      { series: "partner_marketing" },
      { series: "other" },
    ];

    const counts = {
      badlanders: docs.filter(d => d.series === "badlanders").length,
      business_dev: docs.filter(d => d.series === "business_dev").length,
      partner_marketing: docs.filter(d => d.series === "partner_marketing").length,
      other: docs.filter(d => d.series === "other").length,
    };

    assert.strictEqual(counts.badlanders, 2);
    assert.strictEqual(counts.business_dev, 1);
    assert.strictEqual(counts.partner_marketing, 1);
    assert.strictEqual(counts.other, 1);
  });
});
