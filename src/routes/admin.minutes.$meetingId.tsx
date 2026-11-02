import { createFileRoute, Link } from "@tanstack/react-router";
import { Section } from "@/components/desk/Section";
import { Badge } from "@/components/ui/badge";
import { getMeetingMinutes, type MeetingAction } from "@/lib/minutes";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/admin/minutes/$meetingId")({
  component: MeetingDetailPage,
  loader: async ({ params }) => {
    const minutes = await getMeetingMinutes({ data: { meetingId: params.meetingId } });
    return { minutes };
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
  const { minutes } = Route.useLoaderData();

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

  const { meeting, fullText, actions } = minutes;
  const actionsByOwner = groupActionsByOwner(actions);
  const openActions = actions.filter((a) => !a.completed);

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
        <h2 className="font-display text-3xl font-black uppercase leading-tight text-balance">
          {meeting.title}
        </h2>
        <p className="mt-2 text-sm text-sandstone">
          {formatDate(meeting.date)} at {formatTime(meeting.time)} MT
        </p>
      </div>

      {openActions.length > 0 && (
        <Section kicker="Key actions">
          <div className="border border-line bg-paper p-5">
            <ul className="space-y-3">
              {openActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-ember shrink-0 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm">{action.text}</p>
                    {action.owner && (
                      <p className="text-xs text-sandstone mt-1">{action.owner}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {Object.keys(actionsByOwner).length > 0 && (
        <Section kicker="Actions by owner">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(actionsByOwner).map(([owner, ownerActions]) => (
              <div key={owner} className="border border-line bg-paper p-4">
                <p className="text-xs tracking-widest text-sandstone uppercase mb-3">{owner}</p>
                <ul className="space-y-2">
                  {ownerActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="size-1.5 rounded-full bg-coal shrink-0 mt-1.5" />
                      <p className="text-sm text-pretty">{action.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section kicker="Full transcript">
        <div className="border border-line bg-paper p-6">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-coal">
              {fullText}
            </pre>
          </div>
        </div>
      </Section>
    </div>
  );
}
