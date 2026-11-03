import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Section } from "@/components/desk/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMeetingMinutes, type MeetingAction } from "@/lib/minutes";
import { generateStructuredMinutesAsync, type StructuredMinutes } from "@/lib/structured-minutes";
import { formatMeetingDate } from "@/lib/date-format";
import { detectSeries, SERIES_BADGES } from "@/lib/minutes-archive";
import { ChevronLeft, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/minutes/$meetingId")({
  component: MeetingDetailPage,
  head: ({ loaderData }) => {
    // @ts-ignore - loaderData type inference issue
    if (!loaderData || !loaderData.minutes) return {};
    // @ts-ignore
    const pageTitle = formatMeetingDate(loaderData.minutes.meeting.date);
    return {
      meta: [{ title: `${pageTitle} — Minutes — Unearth Self Desk` }],
    };
  },
  loader: async ({ params }) => {
    try {
      // Only fetch meeting data and transcript - render immediately
      // Structured view is generated client-side after mount to avoid timeout
      const minutes = await getMeetingMinutes({ data: { meetingId: params.meetingId } });
      
      return { minutes, error: null };
    } catch (error: any) {
      console.error("Loader error for meeting:", params.meetingId, error);
      
      // Return error state for our component to handle, not null
      // Only show "Meeting not found" for real 404s
      const is404 = error?.code === 404 || error?.message?.includes("404") || error?.message?.includes("not found");
      
      return { 
        minutes: null, 
        error: is404 ? null : (error.message || "Failed to load meeting")
      };
    }
  },
});

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
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

function groupActionsByOwner(actions: MeetingAction[]): Record<string, MeetingAction[]> {
  const grouped: Record<string, MeetingAction[]> = {};
  
  actions.forEach((action) => {
    const owner = action.owner || "Unassigned";
    if (!grouped[owner]) {
      grouped[owner] = [];
    }
    grouped[owner].push(action);
  });
  
  return grouped;
}

function MeetingDetailPage() {
  const loaderData = Route.useLoaderData();
  // @ts-ignore - TanStack Router loader data typing
  const { minutes, error: loaderError } = loaderData || {};
  const [showTranscript, setShowTranscript] = useState(false);
  const [structured, setStructured] = useState<StructuredMinutes | { error: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate structured view on mount (client-side with timeout protection)
  useEffect(() => {
    if (!minutes) return;

    setIsGenerating(true);

    // Call async generation with 55-second client-side timeout
    const timeoutId = setTimeout(() => {
      setStructured({
        error: "Structured view generation timed out. The transcript is very long. Full transcript is available below.",
      });
      setIsGenerating(false);
    }, 55000);

    generateStructuredMinutesAsync({
      data: {
        meetingId: minutes.meeting.id,
        modifiedTime: minutes.meeting.modifiedTime,
        fullText: minutes.fullText,
      },
    })
      .then((result) => {
        clearTimeout(timeoutId);
        setStructured(result);
      })
      .catch((error: any) => {
        clearTimeout(timeoutId);
        console.error("Structured generation failed:", error);
        setStructured({
          error: `Could not generate structured view: ${error.message || "unknown error"}. Full transcript is available below.`,
        });
      })
      .finally(() => {
        setIsGenerating(false);
      });

    return () => clearTimeout(timeoutId);
  }, [minutes?.meeting.id]);

  // Show error component (NOT "Meeting not found" unless it's a real 404)
  if (loaderError) {
    return (
      <div className="grid gap-10">
        <div className="border-l-2 border-ember bg-ember/5 px-4 py-3">
          <p className="text-sm font-semibold text-coal mb-2">
            Error loading meeting
          </p>
          <p className="text-xs text-shale">
            {loaderError}
          </p>
          <Link
            to="/admin/minutes"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ember hover:underline"
          >
            <ChevronLeft className="size-4" />
            Back to minutes
          </Link>
        </div>
      </div>
    );
  }

  if (!minutes) {
    return (
      <div className="grid gap-10">
        <div className="border border-line bg-paper p-8 text-center">
          <p className="text-lg font-semibold">Meeting not found</p>
          <p className="mt-2 text-sm text-muted">
            This meeting may not be accessible or the folder hasn't been shared yet.
          </p>
          <Link
            to="/admin/minutes"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ember hover:underline"
          >
            <ChevronLeft className="size-4" />
            Back to minutes
          </Link>
        </div>
      </div>
    );
  }

  const { meeting, fullText } = minutes;
  const series = detectSeries(meeting.title);
  const badge = SERIES_BADGES[series];

  // Show structured minutes if available, otherwise fallback to transcript
  const hasStructured = structured && !("error" in structured);

  return (
    <div className="grid gap-10">
      <div>
        <Link
          to="/admin/minutes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ember hover:underline mb-4"
        >
          <ChevronLeft className="size-4" />
          Back to minutes
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-3xl font-black uppercase leading-tight text-balance">
            {formatMeetingDate(meeting.date)}
          </h2>
          <Badge tone="new">{badge}</Badge>
        </div>
        <p className="mt-2 text-sm text-sandstone">
          {formatTime(meeting.time)} MT
        </p>
      </div>

      {/* Show loading state while generating */}
      {isGenerating && !structured && (
        <div className="border-l-2 border-coal bg-paper px-5 py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 animate-spin text-sandstone" />
            <p className="text-sm text-sandstone">
              Generating structured view...
            </p>
          </div>
        </div>
      )}

      {hasStructured ? (
        <>
          {/* AI-Generated Structured View */}
          {structured.summary && (
            <Section kicker="Summary">
              <div className="border-l-2 border-coal bg-paper px-5 py-4">
                <p className="text-sm leading-relaxed">{structured.summary}</p>
              </div>
            </Section>
          )}

          {structured.attendees.length > 0 && (
            <Section kicker="Attendees">
              <div className="border border-line bg-paper p-5">
                <div className="flex flex-wrap gap-2">
                  {structured.attendees.map((name: string, idx: number) => (
                    <Badge key={idx} tone="new">{name}</Badge>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {structured.keyDecisions.length > 0 && (
            <Section kicker="Key decisions">
              <div className="space-y-3">
                {structured.keyDecisions.map((decision: { decision: string; source?: string }, idx: number) => (
                  <div key={idx} className="border border-line bg-paper p-5">
                    <div className="flex items-start gap-3">
                      <div className="size-2 rounded-full bg-ember shrink-0 mt-2" />
                      <div className="flex-1">
                        <p className="font-semibold text-pretty">{decision.decision}</p>
                        {decision.source && (
                          <blockquote className="mt-2 border-l-2 border-line pl-3 text-sm text-shale italic">
                            {decision.source}
                          </blockquote>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {structured.actionItems.length > 0 && (
            <Section kicker="Action items">
              <ul className="divide-y divide-line border-y border-line">
                {structured.actionItems.map((action: { owner: string | null; item: string; dueDate: string | null }, idx: number) => (
                  <li key={idx} className="flex items-start justify-between gap-4 py-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="size-2 rounded-full bg-coal shrink-0 mt-2" />
                      <div>
                        <p className="text-sm text-pretty">{action.item}</p>
                        {action.owner && (
                          <p className="text-xs text-sandstone mt-1">{action.owner}</p>
                        )}
                      </div>
                    </div>
                    {action.dueDate && (
                      <Badge tone="hold" className="shrink-0">
                        {new Date(action.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {structured.openQuestions.length > 0 && (
            <Section kicker="Open questions">
              <div className="border border-line bg-paper p-5">
                <ul className="space-y-2">
                  {structured.openQuestions.map((question: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-ember">?</span>
                      <p className="text-sm text-pretty">{question}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}
        </>
      ) : (
        <>
          {structured && "error" in structured && (
            <div className="border-l-2 border-ember bg-ember/5 px-4 py-3">
              <p className="text-sm font-semibold text-coal mb-2">
                Could not generate structured view
              </p>
              <p className="text-xs text-shale">
                {structured.error}
              </p>
              <p className="text-xs text-sandstone mt-2">
                Showing full transcript below.
              </p>
            </div>
          )}
        </>
      )}

      {/* Full Transcript Toggle */}
      <Section kicker="Full transcript">
        <div className="border border-line bg-paper">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex w-full items-center justify-between p-5 text-left hover:bg-fossil/30 transition-colors"
            aria-expanded={showTranscript}
          >
            <span className="font-semibold text-sm">
              {showTranscript ? "Hide" : "Show"} full Gemini transcript
            </span>
            {showTranscript ? (
              <ChevronDown className="size-4 text-sandstone" />
            ) : (
              <ChevronRight className="size-4 text-sandstone" />
            )}
          </button>
          {showTranscript && (
            <div className="border-t border-line p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-coal">
                  {fullText}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
