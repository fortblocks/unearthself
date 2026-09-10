import type { PublicFieldCard } from "./profile";
import { profileEventsFromCard } from "./profile";
import { idbGet, idbSet } from "./idb";

const QUEUE = "trail-quest-bridge-v0";

export type BridgeEvent = {
  at: string;
  personKey: string;
  instanceId: string;
  events: ReturnType<typeof profileEventsFromCard>["events"];
};

export async function queuePublicCard(card: PublicFieldCard): Promise<void> {
  const payload = profileEventsFromCard(card);
  const existing = (await idbGet<BridgeEvent[]>(QUEUE)) ?? [];
  existing.push({
    at: new Date().toISOString(),
    personKey: payload.personKey,
    instanceId: payload.instanceId,
    events: payload.events,
  });
  await idbSet(QUEUE, existing);
}

export async function pendingBridge(): Promise<BridgeEvent[]> {
  return (await idbGet<BridgeEvent[]>(QUEUE)) ?? [];
}

export async function clearBridge(): Promise<void> {
  await idbSet(QUEUE, []);
}

export const BRIDGE_INTAKE = "https://unearthself.xyz/api/quest/events";
