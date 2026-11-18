import assert from "node:assert/strict";
import test from "node:test";
import { SEED_COMPANIES } from "../data/leads.ts";
import {
  draftForCompany,
  draftProblems,
  draftSellsCanyon,
  DRAFT_SUBJECT,
  refreshUnsentDrafts,
  wordCount,
} from "./lead-copy.ts";
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
  hunterScore: 40,
};

const PLAIN_OPENER = `Hi there,

I imagine you've planned more offsites than you'd care to count. I'd love to show you a new one.`;

test("Peyto with no named contact uses the plain opener", () => {
  const { subject, body } = draftForCompany(company);
  const n = wordCount(body);
  assert.equal(subject, DRAFT_SUBJECT);
  assert.equal(subject, "Two days on the land with your team");
  assert.ok(n >= 120 && n <= 180, `got ${n}`);
  assert.deepEqual(draftProblems(body), []);
  assert.equal(draftSellsCanyon(body), false);
  assert.ok(body.startsWith(PLAIN_OPENER));
  assert.doesNotMatch(body, /You lead/);
  assert.doesNotMatch(body, /People \/ HR/);
  assert.match(body, /six to twenty-four/);
  assert.match(body, /Basecamp/);
  assert.match(body, /\nChris$/);
  assert.doesNotMatch(body, /—/);
  assert.doesNotMatch(body, /\$\s*\d/);
  assert.doesNotMatch(body, /Deep Basin/);
  assert.doesNotMatch(body, /two or three day/);
  assert.equal(SEED_COMPANIES.length, 30);
  assert.ok(SEED_COMPANIES.every((card) => card.draftSubject === DRAFT_SUBJECT));
  const titled = SEED_COMPANIES.filter((card) => card.draftBody.includes("You lead"));
  assert.deepEqual(
    titled.map((card) => card.org),
    ["Scott Builders"],
  );
});

test("a real job title keeps the clause, and a department label does not", () => {
  const named = draftForCompany({ ...company, buyerName: "Laura Starchuk", buyerTitle: "Human Resource Manager" });
  assert.match(named.body, /^Hi Laura,/);
  assert.match(named.body, /You lead Human Resource Manager at Peyto Exploration & Development, so I imagine/);

  const department = draftForCompany({ ...company, buyerName: "Laura Starchuk", buyerTitle: "People / HR" });
  assert.ok(department.body.startsWith(`Hi Laura,\n\nI imagine you've planned more offsites than you'd care to count.`));
  assert.doesNotMatch(department.body, /You lead/);

  const culture = draftForCompany({ ...company, buyerName: "Laura Starchuk", buyerTitle: "People & Culture" });
  assert.ok(culture.body.startsWith("Hi Laura,"));
  assert.doesNotMatch(culture.body, /You lead/);

  const untitled = draftForCompany({ ...company, buyerTitle: "Director of People" });
  assert.ok(untitled.body.startsWith(PLAIN_OPENER));
  assert.doesNotMatch(untitled.body, /You lead/);
});

test("refresh keeps sent and stopped cards, and rewrites only unsent drafts", () => {
  const sent: Company = {
    ...company,
    id: "C-02",
    org: "NuVista Energy",
    domain: "nuvistaenergy.com",
    draftSubject: "Old subject",
    draftBody: "Old body that was already sent.",
    status: "sequence",
    filedLeadId: "L-02",
    why: "Keep this why.",
  };
  const stopped: Company = {
    ...company,
    id: "C-03",
    org: "Headwater Exploration",
    draftSubject: "Stopped subject",
    draftBody: "Stopped body.",
    status: "stopped",
  };
  const open: Company = { ...company, draftSubject: "Old", draftBody: "Old body.", why: "Keep the research note." };
  const threads = [
    { id: "M-out", companyId: "C-02", leadId: "L-02", dir: "out", subject: "Sent subject", body: "Sent body." },
    { id: "M-draft", companyId: "C-99", leadId: "", dir: "draft", subject: "Old", body: "Old body." },
    { id: "M-note", companyId: "C-99", leadId: "", dir: "note", subject: "Note", body: "Leave this note." },
  ];
  const next = refreshUnsentDrafts([open, sent, stopped], threads);
  const peyto = next.companies.find((card) => card.id === "C-99");
  const nuvista = next.companies.find((card) => card.id === "C-02");
  const headwater = next.companies.find((card) => card.id === "C-03");
  assert.equal(peyto?.draftSubject, DRAFT_SUBJECT);
  assert.match(peyto?.draftBody ?? "", /^Hi there,/);
  assert.equal(peyto?.why, "Keep the research note.");
  assert.equal(peyto?.hunterScore, 40);
  assert.equal(peyto?.status, "watch");
  assert.equal(nuvista?.draftBody, "Old body that was already sent.");
  assert.equal(nuvista?.why, "Keep this why.");
  assert.equal(headwater?.draftBody, "Stopped body.");
  assert.equal(next.threads.find((thread) => thread.id === "M-out")?.body, "Sent body.");
  assert.equal(next.threads.find((thread) => thread.id === "M-draft")?.subject, DRAFT_SUBJECT);
  assert.ok((next.threads.find((thread) => thread.id === "M-draft")?.body ?? "").startsWith(PLAIN_OPENER));
  assert.doesNotMatch(next.threads.find((thread) => thread.id === "M-draft")?.body ?? "", /You lead/);
  assert.equal(next.threads.find((thread) => thread.id === "M-note")?.body, "Leave this note.");
});
