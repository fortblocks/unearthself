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

export type XaiUsage = { inputTokens: number; outputTokens: number; dollars: number | null };

/** xAI documents 1 USD as 10^10 ticks. https://docs.x.ai/developers/cost-tracking */
export const XAI_USD_TICKS = 10_000_000_000;

export function readXaiUsage(payload: unknown): XaiUsage {
  const usage = payload && typeof payload === "object" ? (payload as { usage?: unknown }).usage : null;
  const record = usage && typeof usage === "object" ? (usage as Record<string, unknown>) : {};
  const asCount = (value: unknown) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  };
  const dollars = (value: unknown) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const ticks = dollars(record.cost_in_usd_ticks);
  return {
    inputTokens: asCount(record.input_tokens ?? record.prompt_tokens),
    outputTokens: asCount(record.output_tokens ?? record.completion_tokens),
    dollars: ticks == null ? dollars(record.cost_in_usd) ?? dollars(record.cost) : ticks / XAI_USD_TICKS,
  };
}

export function parseXaiSearchResponse(
  payload: unknown,
): { companies: unknown; citations: string[]; excerpt: string; searched: boolean; usage: XaiUsage } | { error: string } {
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
  if (companies.length === 0 && !usedWebSearch(record)) {
    return { error: "xAI did not run web search" };
  }
  return {
    companies,
    citations: collectCitations(record),
    searched: usedWebSearch(record),
    excerpt: companies.length === 0 ? text.replace(/\s+/g, " ").slice(0, 180) : "",
    usage: readXaiUsage(record),
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

export type XaiCallResult =
  | { companies: unknown; citations: string[]; excerpt: string; searched: boolean; usage: XaiUsage }
  | { error: string; retryable: boolean };

/** Timeouts, network failures, 429, 5xx, and a body we could not parse are worth another try. */
export function xaiRetryable(status: number | null, message: string) {
  if (status == null) return /timeout|timed out|network|fetch|aborted|econnreset|etimedout|enotfound/i.test(message);
  if (status === 429 || status >= 500) return true;
  return false;
}

export async function callXaiWebSearch(system: string, prompt: string, timeoutMs: number): Promise<XaiCallResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { error: "XAI_API_KEY not configured", retryable: false };
  let response: Response;
  try {
    response = await fetch(XAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(xaiWebSearchRequest(system, prompt)),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    const message = timedOut ? "xAI search timed out" : error instanceof Error ? error.message : "xAI search failed";
    return { error: message, retryable: true };
  }
  const detail = await response.text();
  if (!response.ok || xaiDeprecationSignal(response.status, response.headers, detail)) {
    return { error: formatXaiHttpError(response.status, detail, apiKey), retryable: xaiRetryable(response.status, detail) && !xaiDeprecationSignal(response.status, response.headers, detail) };
  }
  try {
    const parsed = parseXaiSearchResponse(JSON.parse(detail));
    if ("error" in parsed) return { error: parsed.error, retryable: true };
    return parsed;
  } catch {
    return { error: "xAI returned an unexpected shape", retryable: true };
  }
}

export function xaiDeprecationSignal(status: number, headers: Headers, body: string) {
  if (status === 410) return true;
  const deprecation = headers.get("deprecation");
  if (deprecation != null && deprecation.trim() !== "") return true;
  const warning = headers.get("warning") ?? "";
  if (/deprecat/i.test(warning)) return true;
  if (status >= 400 && /deprecated/i.test(body)) return true;
  return false;
}

export async function searchWithRetries(input: {
  system: string;
  prompt: string;
  timeoutMs: number;
  maxRetries: number;
  beforeAttempt: () => Promise<{ allowed: boolean; reason?: "time" }>;
  timeoutForAttempt?: () => number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<
  | { companies: unknown; citations: string[]; excerpt: string; searched: boolean; attempts: number; usage: XaiUsage }
  | { error: string; attempts: number; abandoned?: boolean; timedOut?: boolean }
> {
  const sleep = input.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let failures = 0;
  let lastError = "xAI search failed";
  for (let attempt = 0; attempt <= input.maxRetries; attempt += 1) {
    const gate = await input.beforeAttempt();
    if (!gate.allowed) {
      return { error: "Stopped for time.", attempts: attempt, abandoned: true, timedOut: true };
    }
    const timeoutMs = input.timeoutForAttempt?.() ?? input.timeoutMs;
    if (timeoutMs < 1_000) return { error: "Stopped for time.", attempts: attempt, abandoned: true, timedOut: true };
    const result = await callXaiWebSearch(input.system, input.prompt, timeoutMs);
    if (!("error" in result)) {
      return { ...result, attempts: attempt + 1 };
    }
    failures += 1;
    lastError = result.error;
    if (!result.retryable) return { error: lastError, attempts: attempt + 1, abandoned: true };
    if (failures > input.maxRetries) return { error: lastError, attempts: attempt + 1, abandoned: true };
    await sleep(retryDelay(attempt + 1));
  }
  return { error: lastError, attempts: failures, abandoned: true };
}

function retryDelay(attempt: number) {
  const base = 400 * 2 ** Math.max(0, attempt - 1);
  return base + Math.floor(Math.random() * base);
}
