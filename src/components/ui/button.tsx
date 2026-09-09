import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "outline" | "coal";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xs px-4 text-sm font-semibold transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-40",
        variant === "primary" && "bg-ember text-paper hover:opacity-90",
        variant === "coal" && "bg-coal text-fossil hover:opacity-90",
        variant === "ghost" && "text-shale hover:text-coal",
        variant === "outline" && "border border-line-strong text-coal hover:border-coal",
        className,
      )}
      {...props}
    />
  );
});
