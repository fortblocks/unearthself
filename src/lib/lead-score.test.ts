import assert from "node:assert/strict";
import test from "node:test";
import { SEED_COMPANIES } from "../data/leads.ts";
import { draftForCompany, draftProblems, wordCount } from "./lead-copy.ts";
import {
  bandFor,
  coerceCity,
  geoPoints,
  hasAccess,
  isSendable,
  mergeScoutRows,
  normalizeDomain,
  parseScoutBatch,
  recencyFactor,
  refineStoredCity,
  scoreCompany,
  sizePoints,
  sourcedEmail,
  timingFromSignals,
  type Company,
} from "./lead-score.ts";

const base = {
  city: "Calgary" as const,
  industry: "energy" as const,
  sizeBand: "80-800" as const,
  sourceUrl: "https://www.peyto.com/",
  buyerName: "",
  email: "",
  emailSource: "",
  timingScore: 11,
};

test("headcount scores a tiny company and a very large company", () => {
  assert.equal(sizePoints("80-800"), 22);
  assert.equal(sizePoints("50-79"), 10);
  assert.equal(sizePoints("801-1500"), 10);
  assert.equal(sizePoints("1-49"), 10);
  assert.equal(sizePoints("1500+"), 10);
  assert.equal(sizePoints("unknown"), 8);
});

test("Calgary first-wave mid-size with no access tops out at Fit 60", () => {
  const s = scoreCompany(base);
  assert.equal(s.fit, 60);
  assert.equal(s.geo, 22);
  assert.equal(s.size, 22);
  assert.equal(s.industry, 16);
  assert.equal(s.access, 3);
  assert.equal(s.total, 74);
  assert.equal(s.band, "sequence");
  assert.equal(hasAccess(base), false);
});

test("named buyer + published email + source URL = Access 25 and 100", () => {
  const s = scoreCompany({
    ...base,
    buyerName: "Priya Shah",
    email: "people@peyto.com",
    emailSource: "https://www.peyto.com/contact",
    timingScore: 15,
  });
  assert.equal(s.access, 25);
  assert.equal(s.total, 100);
  assert.equal(s.band, "pursue");
  assert.equal(
    hasAccess({
      ...base,
      buyerName: "Priya Shah",
      email: "people@peyto.com",
      emailSource: "https://www.peyto.com/contact",
    }),
    true,
  );
});

test("unsourced email does not count as published", () => {
  const s = scoreCompany({
    ...base,
    buyerName: "Priya Shah",
    email: "priya.shah@peyto.com",
    emailSource: "",
  });
  assert.equal(s.publishedEmail, 0);
  assert.equal(s.named, 12);
  assert.equal(
    hasAccess({ ...base, buyerName: "Priya Shah", email: "priya.shah@peyto.com", emailSource: "" }),
    false,
  );
});

test("bands", () => {
  assert.equal(bandFor(90), "pursue");
  assert.equal(bandFor(89), "sequence");
  assert.equal(bandFor(70), "sequence");
  assert.equal(bandFor(69), "watch");
  assert.equal(bandFor(50), "watch");
  assert.equal(bandFor(49), "hold");
});

test("Red Deer construction with Access can pursue", () => {
  const s = scoreCompany({
    city: "Red Deer",
    industry: "construction",
    sizeBand: "80-800",
    sourceUrl: "https://scottbuilders.com/who-we-are",
    buyerName: "Laura Starchuk",
    email: "reddeer@scottbuilders.com",
    emailSource: "https://scottbuilders.com/contact",
    timingScore: 12,
  });
  assert.equal(s.fit, 54);
  assert.equal(s.access, 25);
  assert.equal(s.total, 91);
  assert.equal(s.band, "pursue");
});

test("college over 800 is watch without Access", () => {
  const s = scoreCompany({
    city: "Calgary",
    industry: "education",
    sizeBand: "801-1500",
    sourceUrl: "https://bowvalleycollege.ca/",
    buyerName: "",
    email: "",
    emailSource: "",
    timingScore: 8,
  });
  assert.equal(s.size, 10);
  assert.equal(s.total, 59);
  assert.equal(s.band, "watch");
});

test("sendable requires Access and a 70+ band", () => {
  const c = {
    id: "C-01",
    org: "Test",
    domain: "test.example",
    city: "Calgary",
    industry: "energy",
    sizeBand: "80-800",
    sourceUrl: "https://test.example",
    why: "Test.",
    buyerName: "",
    buyerTitle: "",
    email: "",
    emailSource: "",
    timingNote: "",
    timingScore: 11,
    status: "watch",
    filedLeadId: "",
    draftSubject: "",
    draftBody: "",
    lastTouch: "",
    scoutBatch: "seed",
  } as Company;
  const s = scoreCompany(c);
  assert.equal(isSendable(c, s), false);
});

test("normalizeDomain strips protocol and www", () => {
  assert.equal(normalizeDomain("https://www.Peyto.com/about"), "peyto.com");
  assert.equal(normalizeDomain("people@ScottBuilders.com"), "scottbuilders.com");
});

test("scout ingest dedupes on domain at parse time only as rows", () => {
  const { rows, error } = parseScoutBatch(
    JSON.stringify([
      { domain: "https://www.peyto.com", city: "Calgary", industry: "energy", sizeBand: "80-800", sourceUrl: "https://www.peyto.com", why: "Gas." },
      { domain: "peyto.com", city: "Calgary" },
    ]),
  );
  assert.equal(error, null);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.domain, "peyto.com");
});

test("sourcedEmail drops mail without a URL", () => {
  assert.equal(sourcedEmail("priya@peyto.com", "").email, "");
  assert.equal(sourcedEmail("people@peyto.com", "https://www.peyto.com/contact").email, "people@peyto.com");
});

test("mergeScoutRows dedupes on domain and drops unsourced email", () => {
  const { companies, added, merged } = mergeScoutRows(
    SEED_COMPANIES,
    [
      {
        domain: "peyto.com",
        org: "Peyto",
        why: "Updated why.",
        buyer: { name: "Not a person", title: "HR", email: "priya.shah@peyto.com", emailSource: "" },
      },
      {
        domain: "newco.example",
        org: "Newco Energy",
        city: "Calgary",
        industry: "energy",
        sizeBand: "80-800",
        sourceUrl: "https://newco.example/about",
        why: "Scout batch.",
      },
    ],
    { batch: "test", today: "2026-09-17" },
  );
  assert.equal(merged, 1);
  assert.equal(added, 1);
  const peyto = companies.find((c) => c.domain === "peyto.com");
  assert.equal(peyto?.email, "");
  assert.equal(peyto?.why, "Updated why.");
  const fresh = companies.find((c) => c.domain === "newco.example");
  assert.equal(fresh?.org, "Newco Energy");
  assert.equal(fresh?.city, "Calgary");
});

test("seed is ~30 Alberta first-wave cards with no invented personal emails", () => {
  assert.ok(SEED_COMPANIES.length >= 30);
  const sendable = SEED_COMPANIES.filter((c) => isSendable(c, scoreCompany(c)));
  assert.equal(sendable.length, 1);
  assert.equal(sendable[0]?.domain, "scottbuilders.com");
  for (const c of SEED_COMPANIES) {
    if (c.email) {
      assert.ok(c.emailSource.startsWith("http"), `${c.org} email has no source URL`);
      assert.equal(/^[a-z]+\.[a-z]+@/i.test(c.email), false, `${c.org} looks like a personal first.last inbox`);
    }
    const draft = draftForCompany(c);
    const n = wordCount(draft.body);
    assert.ok(n >= 120 && n <= 180, `${c.org} draft is ${n} words`);
    assert.deepEqual(draftProblems(draft.body), []);
  }
});

test("recency decay falls off after two weeks, then 45, 90 and 180 days", () => {
  assert.equal(recencyFactor(0), 1);
  assert.equal(recencyFactor(14), 1);
  assert.equal(recencyFactor(15), 0.7);
  assert.equal(recencyFactor(45), 0.7);
  assert.equal(recencyFactor(46), 0.4);
  assert.equal(recencyFactor(90), 0.4);
  assert.equal(recencyFactor(91), 0.2);
  assert.equal(recencyFactor(180), 0.2);
  assert.equal(recencyFactor(181), 0);
  assert.equal(recencyFactor(-1), 0);
});

test("timingFromSignals uses dated signals and last touch, not a typed score", () => {
  const fresh = timingFromSignals({
    today: "2026-11-17",
    lastTouch: "2026-10-01",
    signals: [
      { kind: "hiring", date: "2026-11-10", sourceUrl: "https://example.com/jobs" },
      { kind: "win", date: "2026-09-01", sourceUrl: "https://example.com/news" },
    ],
  });
  // hiring 8 within 14 days, win 5 at 77 days (factor 0.4), last touch 47 days adds 3
  assert.equal(fresh.signalPoints, 10);
  assert.equal(fresh.touchPoints, 3);
  assert.equal(fresh.timing, 13);

  const recentTouch = timingFromSignals({
    today: "2026-11-17",
    lastTouch: "2026-11-16",
    signals: [{ kind: "hiring", date: "2026-11-10", sourceUrl: "https://example.com/jobs" }],
  });
  assert.equal(recentTouch.touchPoints, -4);
  assert.equal(recentTouch.timing, 4);

  const ignored = timingFromSignals({
    today: "2026-11-17",
    signals: [
      { kind: "office", date: "2026-11-01", sourceUrl: "" },
      { kind: "expansion", date: "not-a-date", sourceUrl: "https://example.com/move" },
      { kind: "year-end", date: "2025-01-01", sourceUrl: "https://example.com/year" },
    ],
  });
  assert.equal(ignored.signalPoints, 0);
  assert.equal(ignored.timing, 0);
});

test("scoreCompany uses signals when they are stored and ignores a typed timing number", () => {
  const scored = scoreCompany({
    city: "Calgary",
    industry: "construction",
    sizeBand: "80-800",
    sourceUrl: "https://scottbuilders.com",
    buyerName: "Scott Builders",
    email: "info@scottbuilders.com",
    emailSource: "https://scottbuilders.com/contact",
    timingScore: 15,
    today: "2026-11-17",
    lastTouch: "2026-09-01",
    signals: [
      {
        id: "S-1",
        kind: "hiring",
        date: "2026-11-12",
        sourceUrl: "https://scottbuilders.com/careers",
        note: "Hiring post",
      },
    ],
  });
  assert.equal(scored.fit, 60);
  assert.equal(scored.access, 25);
  // hiring 8, last touch 77 days adds 1
  assert.equal(scored.timing, 9);
  assert.equal(scored.total, 94);
  assert.equal(scored.band, "pursue");
});

test("dashboard geography ranks Calgary first and an old Elsewhere card follows its place", () => {
  const order = ["Calgary", "Edmonton", "Red Deer", "Alberta", "Canada", "US", "Europe", "Elsewhere"] as const;
  for (let index = 1; index < order.length; index += 1) {
    const higher = order[index - 1] ?? "Calgary";
    const lower = order[index] ?? "Elsewhere";
    assert.ok(geoPoints(higher) > geoPoints(lower));
  }
  assert.ok(geoPoints("Elsewhere") > 0);
  assert.equal(coerceCity("Lethbridge, AB", "Elsewhere"), "Alberta");
  assert.equal(coerceCity("Halifax, NS", "Elsewhere"), "Canada");
  assert.equal(coerceCity("Seattle, WA", "Elsewhere"), "US");
  assert.equal(coerceCity("Berlin, Germany", "Elsewhere"), "Europe");
  assert.equal(refineStoredCity({ ...baseCompany(), city: "Calgary", place: "Seattle, WA" }).city, "Calgary");
  assert.equal(refineStoredCity({ ...baseCompany(), city: "Elsewhere", place: "Toronto, Canada" }).city, "Canada");
  assert.equal(refineStoredCity({ ...baseCompany(), city: "Elsewhere", place: "" }).city, "Elsewhere");
});

function baseCompany(): Company {
  return {
    id: "C-1",
    org: "Example",
    domain: "example.test",
    city: "Elsewhere",
    industry: "other",
    sizeBand: "unknown",
    sourceUrl: "https://example.test",
    why: "",
    buyerName: "",
    buyerTitle: "",
    email: "",
    emailSource: "",
    timingNote: "",
    timingScore: 0,
    status: "watch",
    filedLeadId: "",
    draftSubject: "",
    draftBody: "",
    lastTouch: "",
    scoutBatch: "",
    place: "",
  };
}

test("scoreCompany keeps a stored timing number when the company has no signal list", () => {
  const scored = scoreCompany({
    city: "Edmonton",
    industry: "energy",
    sizeBand: "80-800",
    sourceUrl: "https://firm.example",
    buyerName: "",
    email: "",
    emailSource: "",
    timingScore: 11,
  });
  assert.equal(scored.timing, 11);
  assert.equal(scored.fit, 58);
  assert.equal(scored.access, 3);
  assert.equal(scored.total, 72);
});
