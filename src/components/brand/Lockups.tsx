import { useId } from "react";
import { MARK_D } from "@/brand/mark";

function Mark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 1 1" className={className} role="img" aria-label={title ?? "Unearth Self mark"}>
      <path d={MARK_D} fill="currentColor" />
    </svg>
  );
}

function Place() {
  return (
    <p className="mt-2 text-center text-xs leading-tight tracking-place uppercase opacity-70">
      Drumheller
      <span className="mt-0.5 block">Alberta · Can</span>
    </p>
  );
}

function BootcampLines() {
  return (
    <p className="text-center font-sans text-xs leading-snug font-bold tracking-lockup whitespace-nowrap uppercase">
      Badlands
      <span className="block">Bootcamp</span>
    </p>
  );
}

function UnearthLines({ display = false, side = false }: { display?: boolean; side?: boolean }) {
  return (
    <p
      className={
        side
          ? "font-display text-4xl leading-none font-black uppercase"
          : display
            ? "text-center font-display text-6xl leading-none font-black uppercase"
            : "text-center font-sans text-xs leading-snug font-bold tracking-lockup uppercase"
      }
    >
      Unearth
      <span className="block">Self</span>
    </p>
  );
}

function Ring({ top, bottom }: { top: string; bottom: string }) {
  const uid = useId().replace(/:/g, "");
  const topId = `ring-top-${uid}`;
  const botId = `ring-bot-${uid}`;
  return (
    <svg viewBox="0 0 220 240" className="mx-auto w-44 text-current" role="img" aria-label={`${top}. ${bottom}.`}>
      <defs>
        <path id={topId} d="M28,96 A82,82 0 0,1 192,96" fill="none" />
        <path id={botId} d="M36,128 A78,78 0 0,1 184,128" fill="none" />
      </defs>
      <text fill="currentColor" fontFamily="aktiv-grotesk, Helvetica Neue, sans-serif" fontSize="10" fontWeight="700" letterSpacing="2.6">
        <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
          {top}
        </textPath>
      </text>
      <text fill="currentColor" fontFamily="aktiv-grotesk, Helvetica Neue, sans-serif" fontSize="10" fontWeight="700" letterSpacing="2.2">
        <textPath href={`#${botId}`} startOffset="50%" textAnchor="middle">
          {bottom}
        </textPath>
      </text>
      <circle cx="18" cy="112" r="2.2" fill="currentColor" />
      <circle cx="202" cy="112" r="2.2" fill="currentColor" />
      <g transform="translate(74 78)">
        <svg width="72" height="72" viewBox="0 0 1 1">
          <path d={MARK_D} fill="currentColor" />
        </svg>
      </g>
    </svg>
  );
}

function Card({
  n,
  name,
  dark = false,
  accent = false,
  children,
}: {
  n: string;
  name: string;
  dark?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const ground = dark ? "bg-coal text-fossil" : "bg-paper text-coal";
  const ink = accent ? "text-ember" : "";
  return (
    <figure className={`flex min-h-64 flex-col justify-between border border-line p-5 ${ground}`}>
      <div className={`flex flex-1 items-center justify-center ${ink}`}>{children}</div>
      <figcaption className={`mt-4 flex items-baseline justify-between gap-3 text-xs tracking-widest uppercase ${dark ? "text-fossil/50" : "text-muted"}`}>
        <span>{name}</span>
        <span>{n}</span>
      </figcaption>
    </figure>
  );
}

export function Lockups() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card n=".01" name="Public, stacked">
        <div className="flex flex-col items-center gap-4 text-coal">
          <Mark className="w-24" />
          <UnearthLines display />
        </div>
      </Card>
      <Card n=".02" name="Public, on coal" dark>
        <div className="flex flex-col items-center gap-4">
          <Mark className="w-24" />
          <p className="font-display text-5xl leading-none font-black tracking-tight uppercase">
            Unearth
            <span className="block">Self</span>
          </p>
        </div>
      </Card>
      <Card n=".03" name="Public, horizontal">
        <div className="flex items-center gap-4 text-coal">
          <Mark className="w-16 shrink-0" />
          <UnearthLines side />
        </div>
      </Card>
      <Card n=".04" name="Place, stacked">
        <div className="flex flex-col items-center gap-3 text-coal">
          <Mark className="w-20" />
          <div>
            <BootcampLines />
            <Place />
          </div>
        </div>
      </Card>
      <Card n=".05" name="Place, horizontal">
        <div className="flex items-center gap-4 text-coal">
          <Mark className="w-16 shrink-0" />
          <div>
            <BootcampLines />
            <Place />
          </div>
        </div>
      </Card>
      <Card n=".06" name="Place, no location" dark>
        <div className="flex flex-col items-center gap-3">
          <Mark className="w-20" />
          <BootcampLines />
        </div>
      </Card>
      <Card n=".07" name="Circle, Unearth Self">
        <div className="text-coal">
          <Ring top="BADLANDS BOOTCAMP" bottom="UNEARTH SELF" />
          <Place />
        </div>
      </Card>
      <Card n=".08" name="Circle, on coal" dark>
          <Ring top="BADLANDS BOOTCAMP" bottom="UNEARTH SELF" />
      </Card>
      <Card n=".09" name="Accent circle" dark accent>
        <div>
          <Ring top="BADLANDS BOOTCAMP" bottom="ADVENTURE WELLNESS" />
          <p className="mt-2 text-center text-xs tracking-place text-ember/80 uppercase">
            Drumheller
          </p>
        </div>
      </Card>
      <Card n=".10" name="Accent, stacked" dark accent>
        <div className="flex flex-col items-center gap-3">
          <Mark className="w-20" />
          <div>
            <BootcampLines />
            <p className="mt-2 text-center text-xs tracking-place uppercase opacity-80">
              Drumheller
              <span className="mt-0.5 block">Alberta · Can</span>
            </p>
          </div>
        </div>
      </Card>
      <Card n=".11" name="Accent, horizontal" dark accent>
        <div className="flex items-center gap-4">
          <Mark className="w-16 shrink-0" />
          <BootcampLines />
        </div>
      </Card>
      <Card n=".12" name="Mark alone" dark>
        <Mark className="w-28" title="Mark alone" />
      </Card>
    </div>
  );
}
