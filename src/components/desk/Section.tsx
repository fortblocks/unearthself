import type { ReactNode } from "react";

export function Section({
  kicker,
  action,
  children,
}: {
  kicker: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <p className="text-xs tracking-widest text-sandstone uppercase">{kicker}</p>
        {action}
      </div>
      {children}
    </section>
  );
}
