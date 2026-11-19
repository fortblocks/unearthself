import assert from "node:assert/strict";
import test from "node:test";
import {
  APOLLO_CEILING,
  APOLLO_EMAIL_NOT_VERIFIED,
  APOLLO_OFF,
  APOLLO_SOURCE,
  APOLLO_STALE,
  apolloApiKey,
  apolloCreditCap,
  apolloDateIsStale,
  apolloEmailIsVerified,
  apolloRequestUrl,
  apolloRevealParams,
  apolloSearchParams,
  applyApolloContact,
  enrichHunterContacts,
} from "./apollo.ts";
import { hasBuyerContact, isContactReady } from "./hunter-cap.ts";
import { APOLLO_CASL_STATEMENT } from "./hunter-phase.ts";
import type { Company } from "./lead-score.ts";

const KEY = "test-key-should-not-leak";

function company(over: Partial<Company> = {}): Company {
  return {
    id: "C-100",
    org: "Acme Alpine",
    domain: "acme.example",
    city: "Calgary",
    industry: "energy",
    sizeBand: "80-800",
    sourceUrl: "https://acme.example",
    why: "Research card.",
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
    source: "hunter",
    ...over,
  };
}

function personBody(status: string, extra: Record<string, unknown> = {}) {
  return {
    person: {
      id: "person-1",
      name: "Jordan Blake",
      title: "Head of People",
      email: "jordan.blake@acme.example",
      email_status: status,
      updated_at: "2026-06-01T12:00:00.000Z",
      organization: { name: "Acme Alpine", primary_domain: "acme.example" },
      ...extra,
    },
  };
}

function searchBody() {
  return {
    people: [
      {
        id: "person-1",
        first_name: "Jordan",
        title: "Head of People",
        has_email: true,
        organization: { name: "Acme Alpine" },
      },
    ],
  };
}

test("Apollo stays off when the key is missing", async () => {
  assert.equal(apolloApiKey(""), null);
  assert.equal(apolloApiKey("   "), null);
  let calls = 0;
  const result = await enrichHunterContacts({
    companies: [company()],
    domains: ["acme.example"],
    today: "2026-11-18",
    revealsUsed: 0,
    cap: 48,
    apiKey: null,
    limit: 8,
    fetchImpl: async () => {
      calls += 1;
      throw new Error("Apollo was called");
    },
  });
  assert.equal(calls, 0);
  assert.equal(result.searches, 0);
  assert.equal(result.reveals, 0);
  assert.equal(result.note, APOLLO_OFF);
  assert.equal(result.companies[0]?.email, "");
});

test("a verified Apollo email can count, and an unverified one cannot", () => {
  const verified = applyApolloContact(company(), {
    id: "person-1",
    name: "Jordan Blake",
    title: "Head of People",
    email: "jordan.blake@acme.example",
    emailStatus: "verified",
    updatedOn: "2026-06-01",
    organizationName: "Acme Alpine",
    organizationDomain: "acme.example",
  }, "2026-11-18");
  assert.equal(verified.email, "jordan.blake@acme.example");
  assert.equal(verified.emailSource, "Apollo");
  assert.equal(verified.contactSource, "Apollo");
  assert.equal(verified.caslStatus, "recorded");
  assert.equal(verified.casl?.provider, "Apollo");
  assert.equal(verified.casl?.publishedOn, "Apollo");
  assert.equal(verified.casl?.statement, APOLLO_CASL_STATEMENT);
  assert.equal(verified.casl?.pulledOn, "2026-11-18");
  assert.equal(/^https?:\/\//i.test(verified.emailSource), false);
  assert.equal(/^https?:\/\//i.test(verified.casl?.publishedOn ?? ""), false);
  assert.equal(verified.emailSource, APOLLO_SOURCE);
  assert.equal(verified.apolloPersonId, "person-1");
  assert.equal(verified.apolloEmailStatus, "verified");
  assert.equal(verified.contactRetrievedOn, "2026-11-18");
  assert.equal(verified.enrichment, "enriched");
  assert.equal(hasBuyerContact(verified), true);
  assert.equal(isContactReady(verified), true);
  assert.equal(verified.cardFlags?.includes(APOLLO_EMAIL_NOT_VERIFIED), false);

  for (const status of ["guessed", "extrapolated", "unavailable", "catch-all", "likely to engage"]) {
    const card = applyApolloContact(company(), {
      id: "person-1",
      name: "Jordan Blake",
      title: "Head of People",
      email: "jordan.blake@acme.example",
      emailStatus: status,
      updatedOn: "2026-06-01",
      organizationName: "Acme Alpine",
      organizationDomain: "acme.example",
    }, "2026-11-18");
    assert.equal(card.email, "", status);
    assert.equal(card.emailSource, "", status);
    assert.equal(card.cardFlags?.includes(APOLLO_EMAIL_NOT_VERIFIED), true, status);
    assert.equal(isContactReady(card), false, status);
    assert.equal(apolloEmailIsVerified(status), false);
  }
});

test("a public-page contact still counts without an Apollo person id", () => {
  const card = company({
    buyerName: "Laura Starchuk",
    buyerTitle: "Head of People",
    email: "laura@acme.example",
    emailSource: "https://acme.example/team",
    contactSource: "Public page",
    enrichment: "enriched",
    profileHits: [{ id: "purpose", label: "Purpose", sourceUrl: "https://acme.example/about" }],
  });
  assert.equal(hasBuyerContact(card), true);
  assert.equal(isContactReady(card), true);
  assert.equal(card.emailSource, "https://acme.example/team");
  assert.equal(card.casl?.provider, undefined);
});

test("stale when Apollo's date is more than 12 months old or the employer does not match", () => {
  assert.equal(apolloDateIsStale("2025-11-18", "2026-11-18"), false);
  assert.equal(apolloDateIsStale("2025-11-17", "2026-11-18"), true);
  const old = applyApolloContact(company(), {
    id: "person-1",
    name: "Jordan Blake",
    title: "Head of People",
    email: "jordan.blake@acme.example",
    emailStatus: "verified",
    updatedOn: "2024-11-01",
    organizationName: "Acme Alpine",
    organizationDomain: "acme.example",
  }, "2026-11-18");
  assert.equal(old.cardFlags?.includes(APOLLO_STALE), true);
  assert.equal(old.apolloUpdatedOn, "2024-11-01");
  assert.equal(isContactReady(old), false);

  const moved = applyApolloContact(company(), {
    id: "person-1",
    name: "Jordan Blake",
    title: "Head of People",
    email: "jordan.blake@other.example",
    emailStatus: "verified",
    updatedOn: "2026-06-01",
    organizationName: "Other Co",
    organizationDomain: "other.example",
  }, "2026-11-18");
  assert.equal(moved.cardFlags?.includes(APOLLO_STALE), true);
  assert.equal(moved.email, "");
  assert.equal(moved.buyerName, "");
  assert.equal(isContactReady(moved), false);
});

test("the reveal ceiling stops a second reveal and the key never enters the URL", async () => {
  const urls: string[] = [];
  const result = await enrichHunterContacts({
    companies: [company(), company({ id: "C-101", org: "North Line", domain: "northline.example" })],
    domains: ["acme.example", "northline.example"],
    today: "2026-11-18",
    revealsUsed: 0,
    cap: 1,
    apiKey: KEY,
    limit: 8,
    fetchImpl: async (url, init) => {
      urls.push(url);
      const headers = new Headers(init.headers);
      assert.equal(headers.get("x-api-key"), KEY);
      assert.equal(url.includes(KEY), false);
      assert.equal(url.includes("api_key"), false);
      if (url.includes("/people/match")) {
        const params = new URL(url).searchParams;
        assert.equal(params.get("reveal_phone_number"), "false");
        assert.equal(params.get("run_waterfall_email"), "false");
        assert.equal(params.get("run_waterfall_phone"), "false");
        return Response.json(personBody("verified"));
      }
      return Response.json(searchBody());
    },
  });
  assert.equal(result.reveals, 1);
  assert.equal(result.searches, 1);
  assert.equal(urls.filter((url) => url.includes("/people/match")).length, 1);
  assert.equal(result.note, APOLLO_CEILING);
  assert.equal(result.companies.filter((card) => card.email).length, 1);
});

test("an empty credit cap setting falls back to 48, and the search asks for the target titles", () => {
  assert.equal(apolloCreditCap(""), 48);
  assert.equal(apolloCreditCap("nope"), 48);
  assert.equal(apolloCreditCap("0"), 0);
  const params = apolloSearchParams({ domain: "https://www.acme.example/team", org: "Acme Alpine" });
  assert.equal(params.getAll("person_titles[]").includes("head of people"), true);
  assert.equal(params.getAll("q_organization_domains_list[]")[0], "acme.example");
  assert.equal(params.get("include_similar_titles"), "true");
  const reveal = apolloRequestUrl("people/match", apolloRevealParams("person-1"));
  assert.equal(reveal.startsWith("https://api.apollo.io/api/v1/people/match?"), true);
  assert.equal(reveal.includes(KEY), false);
});
