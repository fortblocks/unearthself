export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border-t border-line pt-3">
      <p className="text-xs tracking-widest text-sandstone uppercase">{label}</p>
      <p className="mt-1 font-display text-3xl font-black uppercase tabular-nums leading-none">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
