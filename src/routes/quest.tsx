import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { QuestShell } from "@/components/quest/QuestShell";

export const Route = createFileRoute("/quest")({
  component: QuestLayout,
  head: () => ({
    meta: [
      { title: "Trail Quest" },
      { name: "theme-color", content: "#161718" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "description",
        content: "Expedition companion. The land is the experience. The pack stays on this device.",
      },
    ],
    links: [
      { rel: "manifest", href: "/quest/manifest.json" },
      { rel: "apple-touch-icon", href: "/quest/icon.svg" },
    ],
  }),
});

function QuestLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const admin = pathname.startsWith("/quest/admin");
  return (
    <QuestShell admin={admin}>
      <Outlet />
    </QuestShell>
  );
}
