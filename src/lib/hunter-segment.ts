/**
 * Hunter sets its own active segment.
 * Authorization: Bearer $HUNTER_WRITE_TOKEN. The same token already gates outreach.
 */

import { getRedisClient } from "./leads-book.ts";
import { bearerConfigured } from "./hunter-read.ts";
import { edmontonToday } from "./lead-score.ts";
import { applyHunterSegment, HUNTER_CAMPAIGN_KEY, loadCampaignState, segmentById } from "./hunter-campaign.ts";

const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 2048;

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function handleHunterSegment(request: Request, now = new Date()) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!bearerConfigured(request.headers.get("authorization"), process.env.HUNTER_WRITE_TOKEN)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) return json({ error: "Unsupported media type" }, 415);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json({ error: "invalid", field: "body" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "invalid", field: "body" }, 400);
  const row = payload as Record<string, unknown>;
  if (typeof row.segmentId !== "string" || typeof row.reason !== "string") return json({ error: "invalid", field: "body" }, 400);
  const today = edmontonToday(now);
  const at = now.toISOString();
  try {
    const redis = await getRedisClient();
    if (!redis) return json({ error: "Unavailable", retryable: true }, 503);
    const state = loadCampaignState(await redis.get(HUNTER_CAMPAIGN_KEY), today);
    const next = applyHunterSegment(state, { segmentId: row.segmentId, reason: row.reason, today, at });
    if ("error" in next) return json(next, 400);
    const switched = next.segmentId !== state.segmentId;
    if (switched) {
      await redis.set(HUNTER_CAMPAIGN_KEY, JSON.stringify(next));
      const latest = next.switches[next.switches.length - 1];
      console.info(JSON.stringify({ hunter: "segment-switch", at: latest?.at ?? at, from: latest?.from ?? state.segmentId, to: next.segmentId }));
    }
    return json(
      {
        ok: true,
        switched,
        from: state.segmentId,
        to: next.segmentId,
        reason: switched ? next.switches[next.switches.length - 1]?.reason ?? "" : "",
        at: switched ? next.switches[next.switches.length - 1]?.at ?? at : "",
        on: today,
        segment: segmentById(next.segmentId).label,
        source: next.segmentSource === "hunter" ? "Hunter's choice" : "Build",
      },
      200,
    );
  } catch {
    return json({ error: "Unavailable", retryable: true }, 503);
  }
}
