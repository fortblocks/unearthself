import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FieldCopy } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { beatSearch } from "@/lib/quest/search";
import { isUnlocked, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/mirror")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <MirrorScreen />
    </RequireGuest>
  ),
});

function MirrorScreen() {
  const { beat: beatQ } = Route.useSearch();
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const saveMirror = useQuest((s) => s.saveMirror);
  const completeBeat = useQuest((s) => s.completeBeat);
  const openMirrors = pack.beats.filter((b) => b.screen === "mirror" && isUnlocked(progress, b.id));
  const beat = openMirrors.find((b) => b.id === beatQ) ?? openMirrors.at(-1);
  const prompts = pack.mirrors.filter((m) => m.beatId === beat?.id);
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [text, setText] = useState("");

  const prompt = prompts[step];
  const saved = beat ? progress.mirror[beat.id] : undefined;

  const echo = useMemo(() => {
    if (!beat || !saved) return "";
    const lines = prompts.map((p) => {
      const a = saved[p.id];
      if (!a) return null;
      const picked = a.choices
        .map((id) => p.options?.find((o) => o.id === id)?.label ?? id)
        .filter(Boolean)
        .join("; ");
      return [picked, a.text].filter(Boolean).join(" — ");
    });
    return lines.filter(Boolean).join(" ");
  }, [beat, saved, prompts]);

  if (!beat) {
    return (
      <>
        <p className="quest-kicker">G08 · Echo Mirror</p>
        <h1 className="quest-title">Not yet</h1>
        <p className="quest-muted">The Mirror opens when the facilitator says so. Pass is always available.</p>
      </>
    );
  }

  function toggle(id: string, upTo: number) {
    setChoices((cur) => {
      if (cur.includes(id)) return cur.filter((c) => c !== id);
      if (upTo <= 1) return [id];
      if (cur.length >= upTo) return [...cur.slice(1), id];
      return [...cur, id];
    });
  }

  function next() {
    if (!prompt || !beat) return;
    saveMirror(beat.id, prompt.id, choices, text);
    setChoices([]);
    setText("");
    if (step + 1 >= prompts.length) completeBeat(beat.id);
    else setStep((s) => s + 1);
  }

  if (!prompt || step >= prompts.length) {
    return (
      <>
        <p className="quest-kicker">G08 · Field record</p>
        <h1 className="quest-title">Echo</h1>
        <p className="quest-echo">{echo || "You passed. That counts."}</p>
        <p className="quest-muted">Sit with this. No diagnosis. Sharing is optional.</p>
        <FieldCopy field={beat.field} simply={beat.simply} />
      </>
    );
  }

  return (
    <>
      <p className="quest-kicker">
        G08 · {prompt.stage} · {step + 1}/{prompts.length}
      </p>
      <h1 className="quest-title">Echo Mirror</h1>
      <p className="quest-field">{prompt.text}</p>
      {prompt.options && (
        <div className="quest-stack" style={{ marginTop: "1rem" }}>
          {prompt.options.map((o) => (
            <label key={o.id} className="quest-choice">
              <input
                type={prompt.chooseUpTo === 1 ? "radio" : "checkbox"}
                name={prompt.id}
                checked={choices.includes(o.id)}
                onChange={() => toggle(o.id, prompt.chooseUpTo ?? 1)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
      {prompt.freeText && (
        <label className="quest-label" style={{ marginTop: "1rem" }}>
          Optional note
          <textarea className="quest-area" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
      )}
      <div className="quest-btn-row">
        <button type="button" className="quest-btn" onClick={next}>
          Continue
        </button>
        <button
          type="button"
          className="quest-btn quest-btn-ghost"
          onClick={() => {
            saveMirror(beat.id, prompt.id, [], "");
            setStep((s) => s + 1);
            if (step + 1 >= prompts.length) completeBeat(beat.id);
          }}
        >
          Pass
        </button>
      </div>
    </>
  );
}
