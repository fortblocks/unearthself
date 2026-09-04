import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const links = [
  { to: "/the-work", label: "The Work" },
  { to: "/bootcamp", label: "Experiences" },
  { to: "/community", label: "Community" },
  { to: "/shop", label: "Shop" },
  { to: "/journal", label: "Journal" },
  { to: "/about", label: "About" },
];

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onHaven = pathname.startsWith("/haven");

  return (
    <div className="min-h-screen bg-fossil text-coal">
      <header className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-4 py-[1.1rem] bg-fossil/55 backdrop-blur-[14px]">
        <Link to="/" className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-wide text-coal">
          <img src="/logo.svg" alt="" width={28} height={28} className="size-7 shrink-0" />
          Unearthself
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-[0.9rem] font-semibold transition-colors ${
                pathname === l.to || (l.to === "/bootcamp" && onHaven) ? "text-coal" : "text-shale hover:text-coal"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {onHaven ? (
            <a
              href="#stay"
              className="rounded-[2px] bg-ember px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white hover:bg-ember-soft"
            >
              Book
            </a>
          ) : (
            <Link
              to="/builder"
              className="rounded-[2px] bg-ember px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white hover:bg-ember-soft"
            >
              Book
            </Link>
          )}
        </nav>
        {onHaven ? (
          <a
            href="#stay"
            className="rounded-[2px] bg-ember px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white hover:bg-ember-soft md:hidden"
          >
            Book
          </a>
        ) : (
          <Link
            to="/builder"
            className="rounded-[2px] bg-ember px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white hover:bg-ember-soft md:hidden"
          >
            Book
          </Link>
        )}
      </header>

      <main className="pt-0">{children}</main>

      <footer className="bg-coal px-4 pt-16 pb-10 text-[0.9rem] text-fossil/70">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-3 flex items-center font-display text-xl font-semibold text-fossil">
              <img
                src="/logo.svg"
                alt=""
                width={22}
                height={22}
                className="mr-2 inline-block brightness-0 invert opacity-90"
              />
              Unearthself
            </div>
            <p className="max-w-sm">
              The holding philosophy, modality and ecosystem for deeper adaptation and presence.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-[0.8rem] font-semibold tracking-widest text-fossil uppercase">Explore</h4>
            <ul className="space-y-2">
              <li><Link to="/the-work" className="hover:text-fossil">The Work</Link></li>
              <li><Link to="/bootcamp" className="hover:text-fossil">Experiences</Link></li>
              <li><Link to="/community" className="hover:text-fossil">Community</Link></li>
              <li><Link to="/journal" className="hover:text-fossil">Journal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[0.8rem] font-semibold tracking-widest text-fossil uppercase">Experiences</h4>
            <ul className="space-y-2">
              <li><Link to="/basecamp" className="hover:text-fossil">Basecamp</Link></li>
              <li><Link to="/bootcamp" className="hover:text-fossil">Badlands Bootcamp</Link></li>
              <li><Link to="/haven" className="hover:text-fossil">Haven</Link></li>
              <li><Link to="/builder" className="hover:text-fossil">Retreat Builder</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[0.8rem] font-semibold tracking-widest text-fossil uppercase">Connect</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-fossil">About</Link></li>
              <li><Link to="/shop" className="hover:text-fossil">Shop</Link></li>
              <li>
                <a href="mailto:hello@unearthself.xyz" className="hover:text-fossil">
                  hello@unearthself.xyz
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl justify-between border-t border-fossil/10 pt-6 text-[0.8rem] text-fossil/45">
          <span>© 2026 Unearthself</span>
          <span>Built with presence</span>
        </div>
      </footer>
    </div>
  );
}
