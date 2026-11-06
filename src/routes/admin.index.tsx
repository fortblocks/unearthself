import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { ActionsDiagnostic, ActionsProvider, OpenActionsPanel } from "@/components/desk/OpenActions";
import {
  ArrivalsSection,
  DiarySection,
  LeadsSection,
  NeedsHumanSection,
  ProgrammeSection,
  RecentMinutesSection,
  ShiftsSection,
  StatsSection,
} from "@/components/desk/TodaySections";
import { resolveActionsSource } from "@/lib/actions/source";
import { partnerFromDesk } from "@/lib/actions/view";
import { partnerFirst, useDesk } from "@/lib/desk-store";

export const Route = createFileRoute("/admin/")({
  component: TodayPage,
  head: () => ({ meta: [{ title: "Today — Unearth Self Desk" }] }),
  loader: async () => {
    return {};
  },
});

function TodayPage() {
  const lookingAs = useDesk((s) => s.lookingAs);
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const partner = partnerFromDesk(lookingAs);
  const norahFirst = lookingAs === "norah";
  const keys = <ArrivalsSection />;
  const diary = <DiarySection />;

  return (
    <ActionsProvider source={resolveActionsSource(searchStr)}>
      <div className="grid gap-10">
        <section className="border-l-2 border-coal bg-paper px-5 py-4">
          <p className="text-xs tracking-widest text-sandstone uppercase">Today</p>
          <p className="mt-2 max-w-prose text-pretty text-lg leading-snug">
            Good morning, {partnerFirst(lookingAs)}. Each block loads on its own. A sample source is marked.
          </p>
          <div className="mt-4">
            <Link
              to="/admin/minutes"
              className="inline-flex min-h-11 items-center border border-line px-3 text-sm font-semibold text-shale hover:border-coal hover:text-coal"
            >
              Recent minutes
            </Link>
          </div>
        </section>

        <StatsSection />
        <OpenActionsPanel variant="mine" owner={partner} kicker="Your actions" />
        <RecentMinutesSection />
        <LeadsSection />
        <ProgrammeSection />

        <section className="grid gap-8 lg:grid-cols-2">
          {norahFirst ? diary : keys}
          <ShiftsSection />
        </section>
        {norahFirst ? keys : diary}

        <NeedsHumanSection />
        <ActionsDiagnostic owner={partner} />
      </div>
    </ActionsProvider>
  );
}
