import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { idbGet, idbSet } from "@/lib/quest/idb";
import { profileEventsFromCard, type PublicFieldCard } from "@/lib/quest/profile";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/hall")({
  component: HallScreen,
});

const HALL_KEY = "trail-quest-hall-v1";

function HallScreen() {
  const pack = useQuest((s) => s.pack);
  const [hall, setHall] = useState<Record<string, PublicFieldCard>>({});

  useEffect(() => {
    void idbGet<Record<string, PublicFieldCard>>(HALL_KEY).then((saved) => {
      if (saved) setHall(saved);
    });
  }, []);

  function write(next: Record<string, PublicFieldCard>) {
    setHall(next);
    void idbSet(HALL_KEY, next);
  }

  const exportBody = {
    schema: "unearthself.hall.v0",
    instanceId: pack.instanceId,
    notes: "omitted",
    people: pack.roster.map((p) => {
      const card = hall[p.id];
      return card ? profileEventsFromCard(card) : { personKey: p.expeditionId, instanceId: pack.instanceId, events: [] };
    }),
  };

  return (
    <div className="quest-hall">
      <p className="quest-kicker">A09 · Hall</p>
      <h1 className="quest-title">Returned</h1>
      <p className="quest-muted">
        Projector board. Chips only. October: mark who is back. Phones do not sync across the canyon. Echo notes never appear here.
      </p>
      <div className="quest-hall-grid">
        {pack.roster.map((p) => {
          const card = hall[p.id];
          return (
            <article key={p.id} className={card?.returnedAt ? "quest-hall-card is-back" : "quest-hall-card"}>
              <h2>{p.name}</h2>
              <p>{p.expeditionId}</p>
              {card ? (
                <ul>
                  <li>{card.mirrorDone ? "Mirror" : "Mirror —"}</li>
                  <li>{card.specimenCount} bones</li>
                  <li>{card.runesActivated.length ? "Rune on" : card.runesReceived.length ? "Rune held" : "Rune —"}</li>
                </ul>
              ) : (
                <p>Still out</p>
              )}
              <button
                type="button"
                className="quest-btn quest-btn-ghost"
                onClick={() =>
                  write({
                    ...hall,
                    [p.id]: {
                      schema: "unearthself.field-card.v0",
                      instanceId: pack.instanceId,
                      participantId: p.id,
                      expeditionId: p.expeditionId,
                      displayName: p.name,
                      teamId: p.teamId,
                      returnedAt: new Date().toISOString(),
                      beatsCompleted: card?.beatsCompleted ?? ["welcome"],
                      specimenCount: card?.specimenCount ?? 0,
                      mirrorDone: card?.mirrorDone ?? false,
                      experimentChosen: card?.experimentChosen ?? false,
                      runesReceived: card?.runesReceived ?? [],
                      runesActivated: card?.runesActivated ?? [],
                    },
                  })
                }
              >
                {card?.returnedAt ? "Here" : "Mark returned"}
              </button>
            </article>
          );
        })}
      </div>
      <div className="quest-btn-row">
        <button
          type="button"
          className="quest-btn"
          onClick={() => {
            const next: Record<string, PublicFieldCard> = {};
            pack.roster.forEach((p, i) => {
              next[p.id] = {
                schema: "unearthself.field-card.v0",
                instanceId: pack.instanceId,
                participantId: p.id,
                expeditionId: p.expeditionId,
                displayName: p.name,
                teamId: p.teamId,
                returnedAt: new Date().toISOString(),
                beatsCompleted: ["welcome", "games", "mirror-1"],
                specimenCount: i === 2 ? 1 : 2,
                mirrorDone: i !== 3,
                experimentChosen: i < 3,
                runesReceived: i === 3 ? ["play"] : ["play", "adaptability"],
                runesActivated: i === 3 ? [] : ["play"],
              };
            });
            write(next);
          }}
        >
          Load demo return
        </button>
        <button type="button" className="quest-btn quest-btn-ghost" onClick={() => write({})}>
          Clear hall
        </button>
      </div>
      <pre className="quest-echo" style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.75rem" }}>
        {JSON.stringify(exportBody, null, 2)}
      </pre>
    </div>
  );
}
