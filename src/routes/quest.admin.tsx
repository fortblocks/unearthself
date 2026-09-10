import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { RequireFacilitator } from "@/components/quest/gates";

export const Route = createFileRoute("/quest/admin")({
  component: AdminLayout,
});

const links = [
  { to: "/quest/admin", label: "Instance", exact: true },
  { to: "/quest/admin/roster", label: "Roster" },
  { to: "/quest/admin/pack", label: "Pack" },
  { to: "/quest/admin/live", label: "Live" },
  { to: "/quest/admin/broadcast", label: "Call" },
  { to: "/quest/admin/safety", label: "Safety" },
  { to: "/quest/admin/after", label: "After" },
  { to: "/quest/admin/paper", label: "Paper" },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <RequireFacilitator>
      <nav className="quest-stack" style={{ marginBottom: "1.25rem" }} aria-label="Facilitator">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 0.9rem" }}>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="quest-muted"
              style={{
                color: (l.exact ? pathname === l.to : pathname.startsWith(l.to)) ? "var(--color-fossil)" : undefined,
                textDecoration: "none",
                fontSize: "0.78rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      <Outlet />
    </RequireFacilitator>
  );
}
