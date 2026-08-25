import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Minimize2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useBuilderStore } from "@/lib/store";
import { detectCurrentSeason } from "@/lib/time";
import { generateBadlanderReply, type ChatMessage } from "@/data/badlander";

const STARTERS = [
  "What does the cold plunge feel like?",
  "Suggest pairings for my plan",
  "What should we pack?",
  "Why is this better than a hotel offsite?",
];

export function BadlanderChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Badlander here. I know these canyons, these plunges, and what your team will remember. Ask me anything — activities, gear, pairings, or how to make Day 2 legendary.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  const days = useBuilderStore((s) => s.days);
  const groupSize = useBuilderStore((s) => s.groupSize);
  const season = useBuilderStore((s) => s.season);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userMsg: ChatMessage = { id: nanoid(8), role: "user", content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    await new Promise((r) => setTimeout(r, 280));
    const effective = season === "auto" ? detectCurrentSeason() : season;
    const reply = generateBadlanderReply({
      message: trimmed,
      days,
      groupSize,
      season: effective,
    });
    setMessages((m) => [...m, { id: nanoid(8), role: "assistant", content: reply }]);
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          className="badlander-fab"
          onClick={() => setOpen(true)}
          aria-label="Open Badlander AI guide"
        >
          <MessageCircle size={22} />
          <span>Ask the Badlander</span>
        </button>
      )}

      {open && (
        <div className="badlander-panel" role="dialog" aria-label="Badlander AI">
          <header className="badlander-head">
            <div>
              <p className="badlander-label">AI Retreat Guide</p>
              <h2>The Badlander</h2>
            </div>
            <div className="badlander-head-actions">
              <button type="button" onClick={() => setOpen(false)} aria-label="Minimize">
                <Minimize2 size={16} />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="badlander-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble ${m.role === "user" ? "is-user" : "is-ai"}`}>
                {m.content.split("\n").map((line, i) => (
                  <p key={i}>{formatLine(line)}</p>
                ))}
              </div>
            ))}
            {busy && <div className="chat-typing">Scouting the answer…</div>}
            <div ref={endRef} />
          </div>

          <div className="badlander-starters">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>

          <form className="badlander-form" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about activities, gear, pairings…"
              aria-label="Message the Badlander"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function formatLine(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
