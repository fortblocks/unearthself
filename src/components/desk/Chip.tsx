import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center rounded-xs px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
        active ? "bg-coal text-fossil" : "border border-line bg-paper text-shale hover:border-coal",
        className,
      )}
      {...props}
    />
  );
}
