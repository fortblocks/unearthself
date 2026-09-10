import type { InstancePack, Participant } from "@/data/quest/types";

export function findByJoinCode(pack: InstancePack, code: string) {
  const trimmed = code.trim().toUpperCase();
  if (trimmed === pack.facilitatorCode) return { role: "facilitator" as const };
  const guest = pack.roster.find((p) => p.joinCode === trimmed);
  if (guest) return { role: "guest" as const, guest };
  return null;
}

export function deriveGuestPack(pack: InstancePack, guest: Participant, revealedRuneIds: string[]) {
  return {
    ...pack,
    roster: pack.roster
      .filter((p) => p.teamId === guest.teamId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        expeditionId: p.expeditionId,
        teamId: p.teamId,
        joinCode: p.id === guest.id ? p.joinCode : "",
        detects: p.id === guest.id ? p.detects : "",
      })),
    geofences: pack.geofences.filter((g) => {
      if (g.kind === "fragment") return g.forParticipantId === guest.detects || g.forParticipantId === guest.id;
      return true;
    }),
    runes: pack.runes.map((r) =>
      revealedRuneIds.includes(r.id)
        ? r
        : { ...r, name: "", principle: "", glyph: "" },
    ),
    facilitatorCode: "",
  };
}

export function targetName(pack: InstancePack, guest: Participant) {
  return pack.roster.find((p) => p.id === guest.detects)?.name ?? "your teammate";
}
