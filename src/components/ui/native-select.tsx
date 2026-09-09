import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-sm border border-line bg-paper px-2 text-sm text-coal outline-none focus:border-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
        className,
      )}
      {...props}
    />
  );
}
