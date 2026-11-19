import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HUNTER_SEARCH_MODEL,
  XAI_RESPONSES_URL,
  formatXaiHttpError,
  parseXaiSearchResponse,
  xaiWebSearchRequest,
} from "./xai-search.ts";

test("web search uses the Responses API and the server-side web_search tool", () => {
  const body = xaiWebSearchRequest("Stay on public pages.", "Find one company.");
  assert.equal(XAI_RESPONSES_URL, "https://api.x.ai/v1/responses");
  assert.equal(body.model, HUNTER_SEARCH_MODEL);
  assert.equal(HUNTER_SEARCH_MODEL, "grok-4.20-0309-non-reasoning");
  assert.deepEqual(body.tools, [{ type: "web_search" }]);
  assert.equal(body.tool_choice, "required");
  assert.deepEqual(body.input, [
    { role: "system", content: "Stay on public pages." },
    { role: "user", content: "Find one company." },
  ]);
  assert.equal("search_parameters" in body, false);
  assert.equal("response_format" in body, false);
  assert.equal(JSON.stringify(body).includes("chat/completions"), false);
});

test("both hunts call the shared web search client and not live search", () => {
  const hunter = readFileSync(new URL("./leads-hunter.ts", import.meta.url), "utf8");
  const scout = readFileSync(new URL("./leads-scout.ts", import.meta.url), "utf8");
  for (const source of [hunter, scout]) {
    assert.equal(source.includes("search_parameters"), false);
    assert.equal(source.includes("chat/completions"), false);
    assert.match(source, /callXaiWebSearch/);
  }
});

test("an HTTP failure keeps the status and drops a secret echoed in the body", () => {
  const secret = "xai-test-key";
  const error = formatXaiHttpError(410, `{"error":"Live search is deprecated","key":"${secret}"}`, secret);
  assert.match(error, /^xAI HTTP 410: /);
  assert.equal(error.includes(secret), false);
  assert.match(error, /Live search is deprecated/);
});

test("Responses output text parses companies and keeps citations", () => {
  const parsed = parseXaiSearchResponse({
    status: "completed",
    citations: ["https://acme.example/about"],
    output: [
      { type: "web_search_call", status: "completed" },
      {
        type: "message",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: 'Here is the list.\n```json\n{ "companies": [{ "org": "Acme Alpine", "domain": "acme.example", "sourceUrl": "https://acme.example/about" }] }\n```',
            annotations: [{ type: "url_citation", url: "https://acme.example/team" }],
          },
        ],
      },
    ],
  });
  assert.equal("error" in parsed, false);
  if ("error" in parsed) return;
  assert.equal(Array.isArray(parsed.companies), true);
  const companies = parsed.companies as Array<{ org: string }>;
  assert.equal(companies.length, 1);
  assert.equal(companies[0]?.org, "Acme Alpine");
  assert.deepEqual(parsed.citations, ["https://acme.example/about", "https://acme.example/team"]);
});

test("a response with no output text is an error, not an empty card list", () => {
  const parsed = parseXaiSearchResponse({
    status: "failed",
    error: { message: "model rejected the tool call" },
    output: [],
  });
  assert.deepEqual(parsed, { error: "model rejected the tool call" });
});

test("JSON without a companies array is an error", () => {
  const parsed = parseXaiSearchResponse({
    output: [{ type: "message", content: [{ type: "output_text", text: '{ "note": "nothing indexed" }' }] }],
  });
  assert.equal("error" in parsed, true);
  if (!("error" in parsed)) return;
  assert.match(parsed.error, /no companies array/);
  assert.match(parsed.error, /nothing indexed/);
});

test("output that is not a company object is not treated as a find", () => {
  const parsed = parseXaiSearchResponse({
    output_text: "I could not search.",
    output: [{ type: "message", content: [{ type: "output_text", text: "I could not search." }] }],
  });
  assert.deepEqual(parsed, { error: "xAI did not return JSON" });
});
