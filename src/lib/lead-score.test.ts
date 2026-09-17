import assert from "node:assert/strict";
import test from "node:test";
import { SEED_COMPANIES } from "../data/leads.ts";
import { draftForCompany, draftProblems, wordCount } from "./lead-copy.ts";
import {
  bandFor,
  hasAccess,
  isSendable,
  mergeScoutRows,
  normalizeDomain,
  parseScoutBatch,
  scoreCompany,
  sourcedEmail,
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
