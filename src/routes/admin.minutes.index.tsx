import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Section } from "@/components/desk/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMeetings, getMeetingMinutes, type Meeting } from "@/lib/minutes";
import { answerQuestion, detectSeries, SERIES_BADGES, type AnswerResult } from "@/lib/minutes-archive";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/minutes/")({
  component: MinutesIndexPage,
  head: () => ({ meta: [{ title: "Minutes — Unearth Self Desk" }] }),
  loader: async () => {
    const meetings = await listMeetings();
    return { meetings };
  },
  pendingComponent: () => (
    <div className="grid gap-10">
      <Section kicker="Badlander's Development Meetings">
        <div className="border border-line bg-paper p-8 text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-sandstone" />
          <p className="mt-4 text-sm text-muted">Loading meetings…</p>
        </div>
      </Section>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="grid gap-10">
      <Section kicker="Badlander's Development Meetings">
        <div className="border border-line bg-paper p-8 text-center">
          <p className="text-lg font-semibold text-ember">Couldn't load meetings</p>
          <p className="mt-2 text-sm text-muted max-w-prose mx-auto">
            {error instanceof Error ? error.message : "An error occurred while loading meetings"}
          </p>
          <Button onClick={() => reset()} className="mt-4">
            Try again
          </Button>
        </div>
      </Section>
    </div>
  ),
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
  try {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  } catch {
    return timeStr;
  }
}

// Check if query is simple keyword or date that can skip AI
function isSimpleQuery(query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  // Simple if it's very short or looks like a date
  if (trimmed.length <= 3) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(trimmed)) return true;
  return false;
}

type SearchState = {
  answer: AnswerResult | null;
  matchedMeetings: Array<{
    meeting: Meeting;
    excerpt?: string;
  }>;
  error: string | null;
};

function MinutesIndexPage() {
  const { meetings } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchState, setSearchState] = useState<SearchState | null>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) {
      setSearchState(null);
      return;
    }

    setSearching(true);
    setSearchState(null);

    try {
      const skipAI = isSimpleQuery(q);
      let answerResult: AnswerResult | null = null;
      let searchError: string | null = null;

      // Run AI answer (unless simple query) and keyword search in parallel
      const [aiResult, keywordResults] = await Promise.all([
        skipAI
          ? Promise.resolve(null)
          : answerQuestion({ data: { question: q } }).catch(() => null),
        searchMeetings(q, meetings),
      ]);

      // Process AI result
      if (aiResult && !("error" in aiResult)) {
        answerResult = aiResult;
      } else if (aiResult && "error" in aiResult && aiResult.error !== "XAI_API_KEY not configured") {
        searchError = aiResult.error;
      }

      setSearchState({
        answer: answerResult,
        matchedMeetings: keywordResults,
        error: searchError,
      });
    } catch (error) {
      setSearchState({
        answer: null,
        matchedMeetings: [],
        error: "Search failed",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSearch();
    }
  };

  // Keyword search over meetings
  async function searchMeetings(
    q: string,
    allMeetings: Meeting[]
  ): Promise<Array<{ meeting: Meeting; excerpt?: string }>> {
    const results: Array<{ meeting: Meeting; excerpt?: string }> = [];
    const lowerQ = q.toLowerCase();

    for (const meeting of allMeetings) {
      // Check title
      if (meeting.title.toLowerCase().includes(lowerQ)) {
        results.push({ meeting });
        continue;
      }

      // Check date
      const formattedDate = formatDate(meeting.date).toLowerCase();
      if (formattedDate.includes(lowerQ) || meeting.date.includes(lowerQ)) {
        results.push({ meeting });
        continue;
      }

      // Check content
      try {
        const minutes = await getMeetingMinutes({ data: { meetingId: meeting.id } });
        if (minutes) {
          const lowerText = minutes.fullText.toLowerCase();
          const queryIndex = lowerText.indexOf(lowerQ);

          if (queryIndex !== -1) {
            // Extract excerpt
            const start = Math.max(0, queryIndex - 80);
            const end = Math.min(minutes.fullText.length, queryIndex + q.length + 80);
            let excerpt = minutes.fullText.slice(start, end);

            if (start > 0) excerpt = "..." + excerpt;
            if (end < minutes.fullText.length) excerpt = excerpt + "...";

            results.push({ meeting, excerpt });
          }
        }
      } catch {
        // Skip this meeting if we can't fetch it
      }
    }

    return results;
  }

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
      <Section kicker="Search meetings and decisions">
        <div className="border border-line bg-paper p-5">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ask a question or search meetings..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={searching}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !query.trim()} className="min-w-32">
              {searching ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span className="ml-2">Searching</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span className="ml-2">Search</span>
                </>
              )}
            </Button>
          </div>

          {searchState?.error && (
            <div className="mt-4 border-l-2 border-ember bg-ember/5 px-4 py-3">
              <p className="text-sm text-coal">{searchState.error}</p>
            </div>
          )}

          {searchState && (
            <div className="mt-6 space-y-6">
              {/* Answer Section */}
              {searchState.answer && (
                <div>
                  <p className="text-xs tracking-widest text-sandstone uppercase mb-3">Answer</p>
                  <div className="border-l-2 border-coal bg-fossil/50 px-4 py-3">
                    <p className="text-sm font-semibold leading-relaxed">{searchState.answer.answer}</p>
                    {searchState.answer.confidence && (
                      <p className="mt-2 text-xs text-sandstone uppercase tracking-widest">
                        Confidence: {searchState.answer.confidence}
                      </p>
                    )}
                  </div>

                  {searchState.answer.sources && searchState.answer.sources.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {searchState.answer.sources.map((source, idx) => (
                        <div key={idx} className="border border-line bg-paper p-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                            <p className="text-xs text-sandstone">
                              {formatDate(source.meetingDate)}
                                {source.isDecision && <Badge tone="won" className="ml-2">Decision</Badge>}
                              </p>
                              <blockquote className="mt-1 text-sm text-shale italic">
                                "{source.excerpt}"
                              </blockquote>
                            </div>
                            {source.documentId && (
                              <Link
                                to="/admin/minutes/$meetingId"
                                params={{ meetingId: source.documentId }}
                                className="text-xs font-semibold text-ember hover:underline shrink-0"
                              >
                                View
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Matched Meetings */}
              {searchState.matchedMeetings.length > 0 && (
                <div>
                  <p className="text-xs tracking-widest text-sandstone uppercase mb-3">
                    {searchState.matchedMeetings.length} matching{" "}
                    {searchState.matchedMeetings.length === 1 ? "meeting" : "meetings"}
                  </p>
                  <ul className="divide-y divide-line border-y border-line">
                    {searchState.matchedMeetings.map(({ meeting, excerpt }) => {
                      const series = detectSeries(meeting.title);
                      const badge = SERIES_BADGES[series];
                      return (
                        <li key={meeting.id} className="flex items-start justify-between gap-4 py-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold" title={meeting.title}>
                                {formatDate(meeting.date)}
                              </p>
                              <Badge tone="new">{badge}</Badge>
                            </div>
                            <p className="text-xs text-sandstone mt-1">{formatTime(meeting.time)} MT</p>
                            {excerpt && (
                              <p className="mt-2 text-sm text-pretty text-shale border-l-2 border-line pl-3">
                                {excerpt}
                              </p>
                            )}
                          </div>
                          <Link
                            to="/admin/minutes/$meetingId"
                            params={{ meetingId: meeting.id }}
                            className="inline-flex min-h-11 items-center border border-line px-3 text-sm font-semibold text-shale hover:border-coal hover:text-coal shrink-0"
                          >
                            View
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {!searchState.answer && searchState.matchedMeetings.length === 0 && (
                <p className="text-sm text-muted text-center py-4">No results found.</p>
              )}
            </div>
          )}

          <p className="mt-4 text-xs text-muted">
            Searches all meetings for answers and matches. Short keywords skip AI to save cost.
          </p>
        </div>
      </Section>

      <Section kicker="Recent meetings">
        <ul className="divide-y divide-line border-y border-line">
          {meetings.map((meeting) => {
            const series = detectSeries(meeting.title);
            const badge = SERIES_BADGES[series];
            return (
              <li key={meeting.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold" title={meeting.title}>
                      {formatDate(meeting.date)}
                    </p>
                    <Badge tone="new">{badge}</Badge>
                  </div>
                  <p className="text-xs text-sandstone mt-1">{formatTime(meeting.time)} MT</p>
                </div>
                <Link
                  to="/admin/minutes/$meetingId"
                  params={{ meetingId: meeting.id }}
                  className="inline-flex min-h-11 items-center border border-line px-3 text-sm font-semibold text-shale hover:border-coal hover:text-coal"
                >
                  View minutes
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
