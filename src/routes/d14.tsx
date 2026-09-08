import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/d14")({ component: D14Layout });

const routes = [
  { to: "/d14/seam" as const, label: "A · Seam" },
  { to: "/d14/basecamp" as const, label: "C · Basecamp" },
  { to: "/d14/specimen" as const, label: "B · Specimen" },
];

function D14Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen">
      <div className="fixed top-0 right-0 left-0 z-[60] flex flex-wrap items-center justify-between gap-3 border-b border-coal/20 bg-coal px-4 py-2.5 text-fossil">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-[0.7rem] tracking-widest uppercase text-fossil/50 hover:text-fossil">
            Live site
          </Link>
          <span className="text-fossil/25">/</span>
          <Link to="/d14" className="text-[0.7rem] tracking-widest uppercase">
            D14 routes
          </Link>
        </div>
        <nav className="flex flex-wrap gap-2">
          {routes.map((r) => {
            const on = pathname === r.to;
            return (
              <Link
                key={r.to}
                to={r.to}
                className={`rounded-[2px] px-3 py-1.5 text-[0.75rem] font-semibold tracking-wide ${
                  on ? "bg-ember text-white" : "border border-fossil/25 text-fossil/80 hover:text-fossil"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="pt-12">
        <Outlet />
      </div>
    </div>
  );
}
