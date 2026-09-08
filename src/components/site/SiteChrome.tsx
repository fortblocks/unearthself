import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const links = [
  { to: "/the-work", label: "The Work" },
  { to: "/bootcamp", label: "Experiences" },
  { to: "/haven", label: "Haven" },
  { to: "/basecamp", label: "Basecamp" },
  { to: "/journal", label: "Journal" },
  { to: "/about", label: "About" },
];

function Mark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-fossil">
      <img
        src="/logo.svg"
        alt=""
        width={22}
        height={22}
        className="size-6 shrink-0 brightness-0 invert opacity-90"
      />
      <span className="font-display text-[1.05rem] font-black uppercase leading-none tracking-[0.16em]">
        Unearth<span className="text-ember">self</span>
      </span>
    </Link>
  );
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onHaven = pathname.startsWith("/haven");
  const onD14 = pathname.startsWith("/d14");
  const bookTo = pathname.startsWith("/for") || pathname.startsWith("/bootcamp") ? "/book/retreat" : "/haven";

  if (onD14) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-fossil text-coal">
      <header className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between bg-coal px-4 py-[1.1rem]">
        <Mark />
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-[0.8rem] font-semibold tracking-wide transition-colors ${
                pathname === l.to || (l.to === "/haven" && onHaven)
                  ? "text-fossil"
                  : "text-fossil/55 hover:text-fossil"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to={bookTo}
            className="rounded-[2px] bg-ember px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white hover:bg-ember-soft"
          >
            Book
          </Link>
        </nav>
        <Link
          to={bookTo}
          className="rounded-[2px] bg-ember px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white hover:bg-ember-soft md:hidden"
        >
          Book
        </Link>
      </header>

      <main className="pt-0">{children}</main>

      <footer className="bg-coal px-4 pt-16 pb-10 text-[0.9rem] text-fossil/70">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-3">
              <Mark />
            </div>
            <p className="max-w-sm">
              PACE is the path. Unearth Self is the purpose. Drumheller, Alberta.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-[0.8rem] font-semibold tracking-widest text-fossil uppercase">Explore</h4>
            <ul className="space-y-2">
              <li><Link to="/the-work" className="hover:text-fossil">The Work</Link></li>
              <li><Link to="/for/teams" className="hover:text-fossil">For teams</Link></li>
              <li><Link to="/journal" className="hover:text-fossil">Journal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[0.8rem] font-semibold tracking-widest text-fossil uppercase">Stay</h4>
            <ul className="space-y-2">
              <li><Link to="/basecamp" className="hover:text-fossil">Basecamp</Link></li>
              <li><Link to="/bootcamp" className="hover:text-fossil">Badlands Bootcamp</Link></li>
              <li><Link to="/haven" className="hover:text-fossil">Haven</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[0.8rem] font-semibold tracking-widest text-fossil uppercase">Connect</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-fossil">About</Link></li>
              <li><Link to="/book/retreat" className="hover:text-fossil">Hold a date</Link></li>
              <li>
                <a href="mailto:hello@unearthself.xyz" className="hover:text-fossil">
                  hello@unearthself.xyz
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl justify-between border-t border-fossil/10 pt-6 text-[0.8rem] text-fossil/45">
          <span>2026 Unearth Self</span>
          <span>Drumheller</span>
        </div>
      </footer>
    </div>
  );
}
