/**
 * One Hunter run at a time. The lock is set only if absent, expires after the
 * function's maximum duration, and is deleted only by the token that took it.
 */

import { HUNTER_FUNCTION_MAX_SECONDS, HUNTER_LOCK_KEY, HUNTER_LOCK_TTL_SECONDS } from "./hunter-config.ts";

const RELEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

export type HunterLockClient = {
  set: (key: string, value: string, opts: { nx: true; ex: number }) => Promise<string | null>;
  eval: (script: string, keys: string[], args: string[]) => Promise<unknown>;
};

/** The old lock was a read, then a write, and it expired before a 300 second run could finish. */
export function lockCanOverlap(ttlSeconds: number, maxDurationSeconds = HUNTER_FUNCTION_MAX_SECONDS) {
  return ttlSeconds <= maxDurationSeconds;
}

export function hunterLockTtl() {
  return HUNTER_LOCK_TTL_SECONDS;
}

export async function acquireHunterLock(client: HunterLockClient, token: string, ttlSeconds = HUNTER_LOCK_TTL_SECONDS) {
  const result = await client.set(HUNTER_LOCK_KEY, token, { nx: true, ex: ttlSeconds });
  return result === "OK";
}

/** Deletes the lock only when the stored token is the caller's. */
export async function releaseHunterLock(client: HunterLockClient, token: string) {
  const result = await client.eval(RELEASE_SCRIPT, [HUNTER_LOCK_KEY], [token]);
  return Number(result) === 1;
}
