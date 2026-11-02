import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Section } from "@/components/desk/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMeetings, askMinutes, type Meeting, type AskResult } from "@/lib/minutes";
import { PARTNERS } from "@/data/desk";
import { Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/minutes/")({
  component: MinutesIndexPage,
  head: () => ({ meta: [{ title: "Minutes — Unearth Self Desk" }] }),
  loader: async () => {
    const meetings = await listMeetings();
    return { meetings };
  },
});

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "America/Edmonton",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  // Convert 24h to 12h format
  try {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  } catch {
    return timeStr;
  }
}

function MinutesIndexPage() {
  const { meetings } = Route.useLoaderData();
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    setAsking(true);
    setAskError(null);
    setAskResult(null);
    
    try {
      const result = await askMinutes({ data: { question: question.trim() } });
      
      if ("error" in result) {
        if (result.error === "XAI_API_KEY not configured") {
          setAskError("Ask feature requires XAI_API_KEY environment variable.");
        } else {
          setAskError(result.error);
        }
      } else {
        setAskResult(result);
      }
    } catch (error) {
      setAskError("Failed to get answer. Please try again.");
    } finally {
      setAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleAsk();
    }
  };

  if (meetings.length === 0) {
    return (
      <div className="grid gap-10">
        <Section kicker="Badlander's Development Meetings">
          <div className="border border-line bg-paper p-8 text-center">
            <p className="text-lg font-semibold">No meetings available yet</p>
            <p className="mt-2 text-sm text-muted max-w-prose mx-auto">
              Minutes will appear once Lisa shares the Meet Recordings folder with the dashboard reader
              service account.
            </p>
            <p className="mt-4 text-xs text-sandstone font-mono">
              unearth-dashboard-reader@unearth-self.iam.gserviceaccount.com
            </p>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      <Section kicker="Ask about meetings">
        <div className="border border-line bg-paper p-5">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ask a question about the meetings... (e.g., 'What was said about insurance?')"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={asking}
              className="flex-1"
            />
            <Button
              onClick={handleAsk}
              disabled={asking || !question.trim()}
              className="min-w-24"
            >
              {asking ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span className="ml-2">Asking</span>
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  <span className="ml-2">Ask</span>
                </>
              )}
            </Button>
          </div>
          
          {askError && (
            <div className="mt-4 border-l-2 border-ember bg-ember/5 px-4 py-3">
              <p className="text-sm text-coal">{askError}</p>
            </div>
          )}
          
          {askResult && (
            <div className="mt-4 space-y-4">
              <div className="border-l-2 border-coal bg-fossil/50 px-4 py-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{askResult.answer}</p>
              </div>
              
              {askResult.citations.length > 0 && (
                <div>
                  <p className="text-xs tracking-widest text-sandstone uppercase mb-3">Sources</p>
                  <div className="space-y-3">
                    {askResult.citations.map((citation, idx) => {
                      const meeting = meetings.find((m) => m.id === citation.meetingId);
                      return (
                        <div key={idx} className="border border-line bg-paper p-4">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <p className="text-xs text-sandstone">
                                {formatDate(citation.meetingDate)} at {formatTime(citation.meetingTime)}
                              </p>
                              {citation.speaker && (
                                <p className="text-xs text-muted mt-1">Speaker: {citation.speaker}</p>
                              )}
                            </div>
                            {meeting && (
                              <Link
                                to="/admin/minutes/$meetingId"
                                params={{ meetingId: meeting.id }}
                                className="text-xs font-semibold text-ember hover:underline"
                              >
                                View meeting
                              </Link>
                            )}
                          </div>
                          <blockquote className="border-l-2 border-line pl-3 text-sm text-pretty text-shale italic">
                            "{citation.excerpt}"
                          </blockquote>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <p className="mt-4 text-xs text-muted">
            Answers are grounded in meeting transcripts only. Ask natural questions like "was this ever said
            on June 23?" or "what did Christopher say about insurance?"
          </p>
        </div>
      </Section>

      <Section kicker="Recent meetings">
        <ul className="divide-y divide-line border-y border-line">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-semibold">{meeting.title}</p>
                <p className="text-sm text-muted">
                  {formatDate(meeting.date)} at {formatTime(meeting.time)} MT
                </p>
              </div>
              <Link
                to="/admin/minutes/$meetingId"
                params={{ meetingId: meeting.id }}
                className="inline-flex min-h-11 items-center border border-line px-3 text-sm font-semibold text-shale hover:border-coal hover:text-coal"
              >
                View minutes
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
