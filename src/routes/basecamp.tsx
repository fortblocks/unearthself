import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/basecamp")({
  component: BasecampLayout,
});

function BasecampLayout() {
  return <Outlet />;
}
