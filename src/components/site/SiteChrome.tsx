import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BookPanel } from "@/components/booking/BookPanel";
import { BookButton } from "@/components/site/BookButton";
import { RuneTape } from "@/components/site/RuneTape";

const links = [
  { to: "/bootcamp", label: "Bootcamp" },
  { to: "/basecamp", label: "Basecamp" },
  { to: "/haven", label: "Haven" },
  { to: "/journal", label: "Journal" },
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
  const onJournal = pathname.startsWith("/journal");
  const onD14 = pathname.startsWith("/d14");
  const onDesk = pathname.startsWith("/admin") || pathname.startsWith("/login");
  const onFound = pathname === "/found";
  const onSpring = pathname === "/spring";
  const onQuest = pathname.startsWith("/quest");

  if (onD14 || onDesk || onFound || onSpring || onQuest) {
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
              className={`text-[0.8rem] font-semibold uppercase tracking-wide transition-colors ${
                pathname === l.to ||
                (l.to === "/haven" && onHaven) ||
                (l.to === "/journal" && onJournal)
                  ? "text-ember"
                  : "text-fossil hover:text-ember"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <BookButton />
        </nav>
        <div className="md:hidden">
          <BookButton />
        </div>
      </header>

      <main className="pt-0">{children}</main>
      <BookPanel />

      <footer className="bg-coal pt-16 text-[0.9rem] text-fossil/70">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 md:flex md:flex-nowrap md:gap-10">
          <div className="md:flex-[2_1_0]">
            <div className="mb-3">
              <Mark />
            </div>
            <p className="max-w-sm uppercase">
              PACE is the path.
              <br />
              Unearth Self is the purpose.
            </p>
          </div>
          <div className="md:flex-[1_1_0] md:min-w-0 md:whitespace-nowrap">
            <h4 className="mb-4 text-[0.8rem] font-semibold tracking-widest text-fossil uppercase">Explore</h4>
            <ul className="space-y-2">
              <li><span className="text-fossil/70">Events</span></li>
              <li><span className="text-fossil/70">Drumheller</span></li>
              <li><Link to="/journal" className="hover:text-fossil">Journal</Link></li>
            </ul>
          </div>
          <div className="md:flex-[1_1_0] md:min-w-0 md:whitespace-nowrap">
            <h4 className="mb-4 text-[0.8rem] font-semibold tracking-widest text-fossil uppercase">Experiences</h4>
            <ul className="space-y-2">
              <li><Link to="/bootcamp" className="hover:text-fossil">Badlands Bootcamp</Link></li>
              <li><Link to="/basecamp" className="hover:text-fossil">Basecamp</Link></li>
              <li><Link to="/haven" className="hover:text-fossil">The Haven</Link></li>
              <li><span className="text-fossil/70">Packages</span></li>
              <li><span className="text-fossil/70">Venue Rentals</span></li>
            </ul>
          </div>
          <div className="md:flex-[1_1_0] md:min-w-0 md:whitespace-nowrap">
            <h4 className="mb-4 text-[0.8rem] font-semibold tracking-widest text-fossil uppercase">Connect</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-fossil">About</Link></li>
              <li><Link to="/book/retreat" className="hover:text-fossil">Inquiries</Link></li>
              <li><span className="text-fossil/70">Find Us</span></li>
              <li>
                <a href="mailto:hello@unearthself.xyz" className="hover:text-fossil">
                  hello@unearthself.xyz
                </a>
              </li>
              <li>
                <a href="tel:+14038234567" className="hover:text-fossil">
                  +1 (403) 823-4567
                </a>
              </li>
            </ul>
          </div>
        </div>
        <RuneTape />
      </footer>
    </div>
  );
}
