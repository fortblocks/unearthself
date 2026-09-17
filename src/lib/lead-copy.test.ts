import assert from "node:assert/strict";
import test from "node:test";
import { draftForCompany, draftProblems, draftSellsCanyon, wordCount } from "./lead-copy.ts";
import type { Company } from "./lead-score.ts";

const company: Company = {
  id: "C-99",
  org: "Peyto Exploration & Development",
  domain: "peyto.com",
  city: "Calgary",
  industry: "energy",
  sizeBand: "80-800",
  sourceUrl: "https://www.peyto.com/",
  why: "Calgary Deep Basin producer. Teams of 12–20. Offsite season is Banff by default.",
  buyerName: "",
  buyerTitle: "People / HR",
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
};

test("house voice is 120–180 words, no price, no canyon", () => {
  const { body } = draftForCompany(company);
  const n = wordCount(body);
  assert.ok(n >= 120 && n <= 180, `got ${n}`);
  assert.deepEqual(draftProblems(body), []);
  assert.equal(draftSellsCanyon(body), false);
  assert.match(body, /People team/);
  assert.doesNotMatch(body, /\$\s*\d/);
});

test("named buyer greets by first name", () => {
  const { body } = draftForCompany({ ...company, buyerName: "Laura Starchuk" });
  assert.match(body, /^Laura —/);
});
