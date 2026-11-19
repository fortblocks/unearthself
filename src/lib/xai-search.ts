// Server-side web search for Hunter. Live search on chat completions returns HTTP 410.
// Current xAI docs: POST /v1/responses with tools: [{ type: "web_search" }].
// https://docs.x.ai/developers/tools/web-search

export const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";

// Server-side web search is called on the Responses API. grok-4.7 is the model in
// the web search examples, and a live hunt with it did not return within 240 seconds.
// This non-reasoning model is the one already used for fast xAI calls in this app.
// Minutes keep their own copy of the id in structured-minutes.ts.
export const HUNTER_SEARCH_MODEL = "grok-4.20-0309-non-reasoning";

export function xaiWebSearchRequest(system: string, prompt: string) {
  return {
    model: HUNTER_SEARCH_MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    tools: [{ type: "web_search" }],
    tool_choice: "required",
  };
}

export function formatXaiHttpError(status: number, body: string, secret = ""): string {
  const redacted = secret ? body.split(secret).join("[redacted]") : body;
  return `xAI HTTP ${status}: ${redacted.slice(0, 400)}`;
}

function outputText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const message = item as { type?: unknown; content?: unknown };
    if (message.type !== "message" || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (!part || typeof part !== "object") continue;
      const piece = part as { type?: unknown; text?: unknown };
      if (piece.type === "output_text" && typeof piece.text === "string") chunks.push(piece.text);
    }
  }
  return chunks.join("\n");
}

function collectCitations(payload: Record<string, unknown>): string[] {
  const urls = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) urls.add(value);
  };
  if (Array.isArray(payload.citations)) {
    for (const item of payload.citations) add(item);
  }
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const annotations = (part as { annotations?: unknown }).annotations;
      if (!Array.isArray(annotations)) continue;
      for (const annotation of annotations) {
        if (!annotation || typeof annotation !== "object") continue;
        add((annotation as { url?: unknown }).url);
      }
    }
  }
  return [...urls];
}

function extractJsonObject(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? text;
  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function parseXaiSearchResponse(
  payload: unknown,
): { companies: unknown; citations: string[]; excerpt: string; searched: boolean } | { error: string } {
  if (!payload || typeof payload !== "object") return { error: "xAI returned no content" };
  const record = payload as Record<string, unknown>;
  const text = outputText(record).trim();
  if (!text) {
    const failure = record.error;
    if (failure && typeof failure === "object" && typeof (failure as { message?: unknown }).message === "string") {
      return { error: String((failure as { message: string }).message).slice(0, 400) };
    }
    if (record.status === "failed" || record.status === "incomplete") {
      return { error: `xAI status ${String(record.status)}` };
    }
    return { error: "xAI returned no content" };
  }
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { error: "xAI did not return JSON" };
  const companies = (parsed as { companies?: unknown }).companies;
  if (!Array.isArray(companies)) {
    return { error: `xAI JSON had no companies array: ${text.replace(/\s+/g, " ").slice(0, 180)}` };
  }
  return {
    companies,
    citations: collectCitations(record),
    searched: usedWebSearch(record),
    excerpt: companies.length === 0 ? text.replace(/\s+/g, " ").slice(0, 180) : "",
  };
}

function usedWebSearch(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.some((item) => {
    if (!item || typeof item !== "object") return false;
    const type = (item as { type?: unknown }).type;
    return type === "web_search_call" || type === "tool_call";
  });
}

export async function callXaiWebSearch(
  system: string,
  prompt: string,
  timeoutMs: number,
): Promise<{ companies: unknown; citations: string[]; excerpt: string; searched: boolean } | { error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { error: "XAI_API_KEY not configured" };
  const response = await fetch(XAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(xaiWebSearchRequest(system, prompt)),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const detail = await response.text();
    return { error: formatXaiHttpError(response.status, detail, apiKey) };
  }
  return parseXaiSearchResponse(await response.json());
}
