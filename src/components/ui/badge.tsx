import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  new: "bg-coal/8 text-coal",
  hold: "bg-sandstone/20 text-shale",
  proposal: "bg-sandstone/30 text-shale",
  won: "bg-ok/15 text-ok",
  lost: "bg-coal/8 text-muted",
  due: "bg-sandstone/25 text-shale",
  sent: "bg-coal/8 text-coal",
  paid: "bg-ok/15 text-ok",
  overdue: "bg-bad/12 text-bad",
  watch: "bg-sandstone/25 text-shale",
  block: "bg-bad/12 text-bad",
  bootcamp: "bg-coal text-fossil",
  haven: "border border-line-strong text-shale",
  basecamp: "bg-shale text-fossil",
  closed: "bg-coal/8 text-muted",
} as const;

export function Badge({
  tone,
  children,
  className,
}: {
  tone: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2 py-0.5 text-xs font-semibold tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
