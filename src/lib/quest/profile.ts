import type { InstancePack, Participant } from "@/data/quest/types";

type ProgressBits = {
  completedBeatIds: string[];
  specimensFound: string[];
  mirror: Record<string, unknown>;
  experimentId: string | null;
  receivedRuneIds: string[];
  activatedRuneIds: string[];
};

export type PublicFieldCard = {
  schema: "unearthself.field-card.v0";
  instanceId: string;
  participantId: string;
  expeditionId: string;
  displayName: string;
  teamId: string;
  returnedAt: string | null;
  beatsCompleted: string[];
  specimenCount: number;
  mirrorDone: boolean;
  experimentChosen: boolean;
  runesReceived: string[];
  runesActivated: string[];
};

export function cardFromProgress(
  pack: InstancePack,
  participant: Participant,
  progress: ProgressBits,
  returnedAt: string | null = new Date().toISOString(),
): PublicFieldCard {
  return {
    schema: "unearthself.field-card.v0",
    instanceId: pack.instanceId,
    participantId: participant.id,
    expeditionId: participant.expeditionId,
    displayName: participant.name,
    teamId: participant.teamId,
    returnedAt,
    beatsCompleted: [...progress.completedBeatIds],
    specimenCount: progress.specimensFound.length,
    mirrorDone: Object.keys(progress.mirror).length > 0,
    experimentChosen: Boolean(progress.experimentId),
    runesReceived: [...progress.receivedRuneIds],
    runesActivated: [...progress.activatedRuneIds],
  };
}

export function profileEventsFromCard(card: PublicFieldCard) {
  return {
    personKey: card.expeditionId,
    instanceId: card.instanceId,
    events: [
      { type: "quest.joined", at: card.returnedAt },
      { type: "quest.returned", at: card.returnedAt },
      { type: "quest.beats", count: card.beatsCompleted.length },
      { type: "quest.specimens", count: card.specimenCount },
      { type: "quest.mirror.completed", done: card.mirrorDone },
      { type: "quest.experiment.chosen", done: card.experimentChosen },
      { type: "quest.runes.received", ids: card.runesReceived },
      { type: "quest.runes.activated", ids: card.runesActivated },
    ],
  };
}
