import assert from "node:assert/strict";
import test from "node:test";
import { clampMorningCount, morningCompanies, parseBook, readLocalCompanies } from "./leads-book.ts";
import { applyVerifiedContacts, buildMorningBatch, contactIfPresent, selectScoutRows } from "./leads-scout.ts";
import { scoreCompany, type Company } from "./lead-score.ts";

const page = "Our people team is led by Laura Starchuk. Write to reddeer@scottbuilders.com for work.";

test("contactIfPresent keeps a name and email only when the page contains them", () => {
  const kept = contactIfPresent(page, "Laura Starchuk", "reddeer@scottbuilders.com", "https://scottbuilders.com/contact");
  assert.equal(kept.name, "Laura Starchuk");
  assert.equal(kept.email, "reddeer@scottbuilders.com");
  assert.equal(kept.emailSource, "https://scottbuilders.com/contact");

  const invented = contactIfPresent(page, "Alex Reid", "alex.reid@scottbuilders.com", "https://scottbuilders.com/contact");
  assert.equal(invented.name, "");
  assert.equal(invented.email, "");

  const noUrl = contactIfPresent(page, "Laura Starchuk", "reddeer@scottbuilders.com", "");
  assert.equal(noUrl.email, "");
});

test("selectScoutRows keeps any headcount and industry in the three cities", () => {
  const rows = selectScoutRows({
    companies: [
      {
        org: "Northline Energy",
        domain: "https://www.northline.example",
        city: "Calgary",
        industry: "energy",
        sizeBand: "120",
        sourceUrl: "https://northline.example/about",
        why: "Calgary producer.",
        buyer: { name: "Pat Lee", email: "pat.lee@northline.example", emailSource: "" },
      },
      {
        org: "Too Small",
        domain: "small.example",
        city: "Edmonton",
        industry: "energy",
        sizeBand: "40",
        sourceUrl: "https://small.example",
      },
      {
        org: "Wrong city",
        domain: "lethbridge.example",
        city: "Lethbridge",
        industry: "energy",
        sizeBand: "200",
        sourceUrl: "https://lethbridge.example",
      },
      {
        org: "Tech adjacent",
        domain: "software.example",
        city: "Calgary",
        industry: "tech",
        sizeBand: "80-800",
        sourceUrl: "https://software.example",
      },
      {
        org: "Huge Tech",
        domain: "huge.example",
        city: "Red Deer",
        industry: "other",
        sizeBand: "5000",
        sourceUrl: "https://huge.example",
      },
      {
        org: "Geolab Studio",
        domain: "studio.example",
        city: "Calgary",
        industry: "tech",
        sizeBand: "200",
        sourceUrl: "https://studio.example",
      },
    ],
  });
  assert.deepEqual(rows.map((row) => row.domain), ["northline.example", "small.example", "software.example", "huge.example"]);
  assert.equal(rows[0]?.sizeBand, "80-800");
  assert.equal(rows[1]?.sizeBand, "1-49");
  assert.equal(rows[3]?.sizeBand, "1500+");
  assert.equal(rows[0]?.buyer?.email, "pat.lee@northline.example");
});

test("applyVerifiedContacts blanks a buyer when the page does not contain the contact", () => {
  const [row] = applyVerifiedContacts(
    [
      {
        domain: "northline.example",
        buyer: {
          name: "Pat Lee",
          title: "People",
          email: "pat.lee@northline.example",
          emailSource: "https://northline.example/team",
        },
      },
    ],
    { "https://northline.example/team": "The company site mentions no person." },
  );
  assert.equal(row?.buyer?.name, "");
  assert.equal(row?.buyer?.email, "");
});

test("buildMorningBatch dedupes domains and stores the top new scores", () => {
  const existing = [
    {
      id: "C-001",
      org: "Already",
      domain: "already.example",
      city: "Calgary",
      industry: "energy",
      sizeBand: "80-800",
      sourceUrl: "https://already.example",
      why: "Known.",
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
      lastTouch: "2026-09-01",
      scoutBatch: "old",
    },
  ] as Company[];
  const batch = buildMorningBatch(
    existing,
    [
      {
        domain: "already.example",
        org: "Already",
        city: "Calgary",
        industry: "energy",
        sizeBand: "80-800",
        sourceUrl: "https://already.example",
        why: "Still known.",
      },
      {
        domain: "fresh.example",
        org: "Fresh Energy",
        city: "Edmonton",
        industry: "energy",
        sizeBand: "80-800",
        sourceUrl: "https://fresh.example/about",
        why: "Hiring.",
        signals: [{ kind: "hiring", date: "2026-11-16", sourceUrl: "https://fresh.example/jobs", note: "Careers page" }],
      },
      {
        domain: "quiet.example",
        org: "Quiet Civic",
        city: "Red Deer",
        industry: "civic",
        sizeBand: "80-800",
        sourceUrl: "https://quiet.example",
        why: "No signals.",
      },
    ],
    { today: "2026-11-17", limit: 10 },
  );
  assert.equal(batch.added, 2);
  assert.equal(batch.morningIds.length, 2);
  const fresh = batch.companies.find((company) => company.domain === "fresh.example");
  assert.ok(fresh);
  assert.equal(batch.morningIds[0], fresh?.id);
  const scored = scoreCompany({ ...fresh, today: "2026-11-17" });
  assert.ok(scored.timing > 0);
  assert.notEqual(fresh?.timingScore, 11);
  assert.equal(batch.companies.filter((company) => company.domain === "already.example").length, 1);
});

test("morning count stays between 10 and 20 and the morning list is that day's ids", () => {
  assert.equal(clampMorningCount("8"), 10);
  assert.equal(clampMorningCount(14.4), 14);
  assert.equal(clampMorningCount(40), 20);
  assert.equal(clampMorningCount("nope"), 10);
  const book = parseBook({
    morningCount: 12,
    morning: { date: "2026-11-17", ids: ["C-002", "C-001"] },
    companies: [
      { id: "C-001", org: "One", domain: "one.example" },
      { id: "C-002", org: "Two", domain: "two.example" },
    ],
  });
  assert.deepEqual(
    morningCompanies(book, "2026-11-17").map((company) => company.id),
    ["C-002", "C-001"],
  );
  assert.equal(morningCompanies(book, "2026-11-18").length, 0);
});

test("readLocalCompanies reads the desk persist blob and ignores junk", () => {
  const raw = JSON.stringify({
    state: { companies: [{ id: "C-009", org: "Local", domain: "local.example" }, { id: 1 }] },
    version: 4,
  });
  const rows = readLocalCompanies(raw);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.domain, "local.example");
  assert.equal(readLocalCompanies("not json").length, 0);
  assert.equal(readLocalCompanies(null).length, 0);
});

test("a saved lead keeps the Hunter score and drops a Partner flag", () => {
  const book = parseBook({
    companies: [
      {
        id: "C-003",
        org: "Three",
        domain: "three.example",
        source: "hunter",
        hunterScore: 80,
        hunterBreak: { profile: 40, access: 20, timing: 10, travel: 10 },
        partnerFlag: { flagged: true, reason: "Outdoor brand", sourceUrl: "https://three.example" },
        profileHits: [{ id: "distributed", label: "Distributed", sourceUrl: "https://three.example" }],
      },
    ],
  });
  const company = book.companies[0];
  assert.ok(company);
  assert.equal(company.source, "hunter");
  assert.equal(company.profileHits?.[0]?.id, "distributed");
  assert.equal(company.hunterScore, 80);
  assert.equal(company.hunterBreak?.profile, 40);
  assert.equal("partnerFlag" in company, false);
});
