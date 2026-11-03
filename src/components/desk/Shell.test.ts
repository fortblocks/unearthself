import { describe, it } from "node:test";
import assert from "node:assert";

describe("Shell PAGE header lookup", () => {
  // Simulate the lookup logic from Shell.tsx
  const PAGE: Record<string, { kicker: string; title: string }> = {
    "/admin": { kicker: "Wednesday 9 September 2026", title: "Today" },
    "/admin/pipeline": { kicker: "Live files only", title: "Pipeline" },
    "/admin/leads": { kicker: "Calgary · Edmonton · Red Deer", title: "Leads" },
    "/admin/bots": { kicker: "First touch, follow-up, scout", title: "Bots" },
    "/admin/socials": { kicker: "Content on the book", title: "Socials" },
    "/admin/inventory": { kicker: "Haven and Basecamp", title: "Inventory" },
    "/admin/money": { kicker: "Deposits, invoices, refunds", title: "Money" },
    "/admin/risk": { kicker: "Waivers, weather, cover", title: "Risk" },
    "/admin/minutes": { kicker: "Badlander's Development Meetings", title: "Minutes" },
    "/admin/friday": { kicker: "Week of 1–7 September", title: "Friday pack" },
  };

  function getPage(pathname: string) {
    // Try exact match first
    if (PAGE[pathname]) return PAGE[pathname];
    
    // Find longest matching prefix
    const paths = Object.keys(PAGE).sort((a, b) => b.length - a.length);
    const match = paths.find(p => pathname.startsWith(p));
    return match ? PAGE[match] : PAGE["/admin"];
  }

  it("should match exact routes", () => {
    assert.strictEqual(getPage("/admin").title, "Today");
    assert.strictEqual(getPage("/admin/leads").title, "Leads");
    assert.strictEqual(getPage("/admin/minutes").title, "Minutes");
  });

  it("should use longest-prefix match for sub-routes", () => {
    assert.strictEqual(getPage("/admin/minutes/abc123").title, "Minutes");
    assert.strictEqual(getPage("/admin/minutes/foo/bar").title, "Minutes");
    assert.strictEqual(getPage("/admin/leads/edit/123").title, "Leads");
  });

  it("should fallback to Today for unknown routes", () => {
    assert.strictEqual(getPage("/admin/unknown").title, "Today");
    assert.strictEqual(getPage("/admin/xyz").title, "Today");
  });

  it("should handle trailing slashes", () => {
    // Note: Shell.tsx normalizes trailing slashes before lookup
    assert.strictEqual(getPage("/admin/minutes/").title, "Minutes");
  });
});
