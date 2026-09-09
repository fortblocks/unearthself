import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Banknote,
  BarChart3,
  CalendarDays,
  ClipboardList,
  TriangleAlert,
  Warehouse,
} from "lucide-react";
import { Toaster } from "sonner";
import { DeskMark } from "@/components/desk/Mark";
import { NativeSelect } from "@/components/ui/native-select";
import { PARTNERS } from "@/data/desk";
import { signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/cn";
import { useDesk } from "@/lib/desk-store";

const NAV = [
  { to: "/admin", label: "Today", icon: CalendarDays },
  { to: "/admin/pipeline", label: "Pipeline", icon: ClipboardList },
  { to: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { to: "/admin/money", label: "Money", icon: Banknote },
  { to: "/admin/risk", label: "Risk", icon: TriangleAlert },
  { to: "/admin/friday", label: "Friday", icon: BarChart3 },
] as const;

const PAGE: Record<string, { kicker: string; title: string }> = {
  "/admin": { kicker: "Wednesday 9 September 2026", title: "Today" },
  "/admin/pipeline": { kicker: "Sales book", title: "Pipeline" },
  "/admin/inventory": { kicker: "Haven and Basecamp", title: "Inventory" },
  "/admin/money": { kicker: "Deposits, invoices, refunds", title: "Money" },
  "/admin/risk": { kicker: "Waivers, weather, cover", title: "Risk" },
  "/admin/friday": { kicker: "Week of 1–7 September", title: "Friday pack" },
};

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lookingAs = useDesk((s) => s.lookingAs);
  const setLookingAs = useDesk((s) => s.setLookingAs);
  const riskAll = useDesk((s) => s.risk);
  const moneyAll = useDesk((s) => s.money);
  const partner = PARTNERS.find((p) => p.id === lookingAs);
  const openRisk = riskAll.filter((r) => r.open).length;
  const overdue = moneyAll.filter((m) => m.status === "overdue").length;
  const page = PAGE[pathname] ?? PAGE["/admin"];

  const counts: Record<string, number> = {
    "/admin/risk": openRisk,
    "/admin/money": overdue,
  };

  return (
    <div className="min-h-dvh bg-fossil text-coal md:grid md:grid-cols-[15.5rem_1fr]">
      <aside className="bg-coal text-fossil">
        <div className="flex items-center justify-between px-5 py-5 md:block md:px-6 md:pt-8">
          <div className="flex items-center gap-3">
            <DeskMark className="size-7" />
            <div>
              <p className="font-display text-2xl font-black uppercase tracking-widest">
                Unearth<span className="text-ember">self</span>
              </p>
              <p className="mt-1 text-xs tracking-widest text-fossil/50 uppercase">Desk</p>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-0.5 md:px-3 md:pb-6">
          {NAV.map((item) => {
            const active =
              item.to === "/admin"
                ? pathname === "/admin" || pathname === "/admin/"
                : pathname.startsWith(item.to);
            const Icon = item.icon;
            const count = counts[item.to] ?? 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-3 rounded-sm px-3 text-sm font-semibold transition-colors duration-150",
                  active ? "bg-fossil/10 text-fossil" : "text-fossil/55 hover:text-fossil",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                {item.label}
                {count > 0 ? (
                  <span className="ml-auto hidden tabular-nums text-sandstone md:inline">{count}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-fossil/10 px-6 py-5 md:block">
          <p className="mb-2 text-xs tracking-widest text-sandstone uppercase">Looking as</p>
          <NativeSelect
            value={lookingAs}
            onChange={(e) => setLookingAs(e.target.value as typeof lookingAs)}
            className="border-fossil/20 bg-coal text-fossil focus:border-ember"
            aria-label="Partner view"
          >
            {PARTNERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
          <p className="mt-2 text-xs text-fossil/45">{partner?.seat}</p>
          <SignOutLink />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-end justify-between gap-4 border-b border-line px-5 py-4 md:px-10">
          <div>
            <p className="text-xs tracking-widest text-sandstone uppercase">{page.kicker}</p>
            <h1 className="font-display text-4xl font-black uppercase leading-none text-balance md:text-5xl">
              {page.title}
            </h1>
          </div>
          <div className="flex items-center gap-3 md:hidden">
            <label className="sr-only" htmlFor="look-mobile">
              Looking as
            </label>
            <NativeSelect
              id="look-mobile"
              value={lookingAs}
              onChange={(e) => setLookingAs(e.target.value as typeof lookingAs)}
              className="h-11 max-w-40"
            >
              {PARTNERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first}
                </option>
              ))}
            </NativeSelect>
          </div>
          <p className="hidden max-w-48 text-right text-xs text-pretty text-muted md:block">
            If it is not here, it does not exist.
          </p>
        </header>
        <div className="px-5 py-6 md:px-10 md:py-8">{children}</div>
      </div>
      <Toaster
        theme="light"
        position="bottom-right"
        toastOptions={{
          className: "font-sans",
          style: {
            background: "var(--color-paper)",
            border: "1px solid var(--color-line-strong)",
            color: "var(--color-coal)",
            borderRadius: "4px",
          },
        }}
      />
    </div>
  );
}

function SignOutLink() {
  const user = useCurrentUser();
  const [busy, setBusy] = useState(false);
  if (!user || hasGateSessionMarker()) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void signOut("/login").catch(() => setBusy(false));
      }}
      className="mt-4 text-left text-xs tracking-widest text-fossil/45 uppercase hover:text-fossil"
    >
      {busy ? "Leaving…" : "Sign out"}
    </button>
  );
}
