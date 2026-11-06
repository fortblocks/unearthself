import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Section } from "@/components/desk/Section";
import { Button } from "@/components/ui/button";
import { partnerFirst, useDesk } from "@/lib/desk-store";
import {
  extractAllActions,
  getActionCompletions,
  markActionComplete,
  isRedisConfigured,
} from "@/lib/action-tracking";
import { formatDateOrdinal } from "@/lib/minutes-archive";

export const Route = createFileRoute("/admin/")({
  component: TodayPage,
  head: () => ({ meta: [{ title: "Today — Unearth Self Desk" }] }),
  loader: async () => {
    const [allActions, completions, redisConfigured] = await Promise.all([
      extractAllActions(),
      getActionCompletions(),
      isRedisConfigured(),
    ]);
    
    // Safe diagnostics: log action counts per partner
    const partnerTotals = {
      Lisa: allActions.filter(a => a.owner === 'Lisa').length,
      Tess: allActions.filter(a => a.owner === 'Tess').length,
      Christopher: allActions.filter(a => a.owner === 'Christopher').length,
      Norah: allActions.filter(a => a.owner === 'Norah').length,
    };
    console.log('[Today loader] All actions by partner:', JSON.stringify(partnerTotals));
    
    return { allActions, completions, redisConfigured };
  },
});

function TodayPage() {
  const lookingAs = useDesk((s) => s.lookingAs);
  
  // Load action tracking data
  const { allActions, completions, redisConfigured } = Route.useLoaderData();
  const [localCompletions, setLocalCompletions] = useState(completions);
  const [markingComplete, setMarkingComplete] = useState<string | null>(null);
  
  // Normalize lookingAs to match PartnerName format (capitalize first letter)
  const normalizedPartner = (lookingAs.charAt(0).toUpperCase() + lookingAs.slice(1)) as "Lisa" | "Tess" | "Norah" | "Christopher";
  
  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Filter for this partner's open actions from last 30 days
  const completedActionIds = new Set(
    localCompletions.filter((c) => !c.undone).map((c) => c.actionId)
  );
  // Count actions before filtering
  const beforeDate = allActions.filter(a => a.owner === normalizedPartner).length;
  const afterDate = allActions.filter(a => a.owner === normalizedPartner && a.meetingDate >= thirtyDaysAgoStr).length;
  
  const myOpenActions = allActions.filter(
    (a) => a.owner === normalizedPartner && 
           !completedActionIds.has(a.id) &&
           a.meetingDate >= thirtyDaysAgoStr  // Only last 30 days for Today page
  );
  
  // Safe diagnostics: log filtering stages
  console.log(`[Today/${normalizedPartner}] Total actions for partner: ${beforeDate}`);
  console.log(`[Today/${normalizedPartner}] After date filter (>= ${thirtyDaysAgoStr}): ${afterDate}`);
  console.log(`[Today/${normalizedPartner}] After completions filter: ${myOpenActions.length}`);
  
  // Handle mark complete
  const handleMarkComplete = async (actionId: string) => {
    if (!redisConfigured) return;
    setMarkingComplete(actionId);
    try {
      const result = await markActionComplete({ data: { actionId, completedBy: normalizedPartner } });
      if (result.ok) {
        // Add to local completions
        setLocalCompletions([...localCompletions, {
          actionId,
          completedBy: normalizedPartner,
          completedAt: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error("Failed to mark action complete:", error);
    } finally {
      setMarkingComplete(null);
    }
  };

  return (
    <div className="grid gap-10 max-w-5xl">
      <section className="border-l-2 border-coal bg-paper px-5 py-4">
        <p className="text-xs tracking-widest text-sandstone uppercase">Today</p>
        <p className="mt-2 text-pretty text-lg leading-snug">
          Good morning, {partnerFirst(lookingAs)}. Your assigned actions from recent meetings are shown below.
        </p>
        <div className="mt-4">
          <Link
            to="/admin/minutes"
            className="inline-flex min-h-11 items-center border border-line px-3 text-sm font-semibold text-shale hover:border-coal hover:text-coal"
          >
            All minutes
          </Link>
        </div>
      </section>

      {myOpenActions.length > 0 ? (
        <Section
          kicker="Your assigned actions"
          action={
            <Link to="/admin/minutes" className="text-sm font-semibold text-ember">
              All actions
            </Link>
          }
        >
          <ul className="divide-y divide-line border-y border-line">
            {myOpenActions.map((action) => (
              <li key={action.id} className="flex items-start justify-between gap-4 py-3">
                <div className="flex-1">
                  <p className="font-semibold">{action.text}</p>
                  <p className="mt-1 text-sm text-muted">
                    <Link 
                      to="/admin/minutes" 
                      search={{ meetingId: action.meetingId }}
                      className="hover:underline"
                    >
                      {formatDateOrdinal(action.meetingDate)} · {action.meetingTitle}
                    </Link>
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={!redisConfigured || markingComplete === action.id}
                  onClick={() => handleMarkComplete(action.id)}
                  className="text-sm px-3 py-1 whitespace-nowrap"
                >
                  {markingComplete === action.id ? "..." : "Mark complete"}
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      ) : (
        <Section kicker="Your assigned actions">
          <div className="border border-line bg-paper p-8 text-center">
            <p className="text-muted">
              No open actions from meetings in the last 30 days. View{" "}
              <Link to="/admin/minutes" className="text-ember hover:underline">
                all minutes
              </Link>{" "}
              for completed actions and full meeting history.
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}
