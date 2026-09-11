import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireGuest } from "@/components/quest/gates";
import { listNotes, type EchoNote } from "@/lib/quest/idb";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/diary")({
  component: () => (
    <RequireGuest>
      <DiaryScreen />
    </RequireGuest>
  ),
});

function DiaryScreen() {
  const pack = useQuest((s) => s.pack);
  const mirror = useQuest((s) => s.progress.mirror);
  const [notes, setNotes] = useState<EchoNote[]>([]);

  useEffect(() => {
    void listNotes().then(setNotes);
  }, [mirror]);

  const pages = notes.length
    ? notes
    : Object.entries(mirror).flatMap(([beatId, answers]) =>
        Object.entries(answers).map(([promptId, a]) => ({
          id: `${beatId}-${promptId}`,
          beatId,
          promptId,
          choices: a.choices,
          text: a.text,
          at: "",
        })),
      );

  return (
    <>
      <p className="quest-kicker">Diary</p>
      <h1 className="quest-title">Field record</h1>
      <p className="quest-muted">On this phone only. The hall sees that you wrote, not the words — unless you release them at Basecamp.</p>
      {pages.length === 0 && (
        <div className="quest-card">
          <span className="quest-chip">Empty</span>
          <strong>How a page looks</strong>
          <p className="quest-muted" style={{ margin: 0 }}>
            Notice. Orient. Choose. Then the app reads your words back. No diagnosis.
          </p>
        </div>
      )}
      {pages.map((n) => {
        const beat = pack.beats.find((b) => b.id === n.beatId);
        return (
          <article key={n.id} className="quest-echo">
            <p className="quest-chip">{beat?.title ?? n.beatId}</p>
            <p style={{ margin: 0 }}>{n.text || n.choices.join(", ") || "Passed."}</p>
          </article>
        );
      })}
    </>
  );
}
