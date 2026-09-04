import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/haven")({
  component: HavenLayout,
});

function HavenLayout() {
  return <Outlet />;
}
