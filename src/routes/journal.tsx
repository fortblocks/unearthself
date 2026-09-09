import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/journal")({
  component: JournalLayout,
});

function JournalLayout() {
  return <Outlet />;
}
