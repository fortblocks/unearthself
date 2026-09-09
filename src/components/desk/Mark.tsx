export function DeskMark({ className = "size-16" }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt=""
      width={64}
      height={64}
      className={`brightness-0 invert ${className}`}
    />
  );
}

export function LoginFrame({ children }: { children?: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-coal px-6 text-fossil">
      <div className="w-full max-w-xs">
        <div className="mb-10 flex flex-col items-center text-center">
          <DeskMark className="size-14" />
          <p className="mt-6 font-display text-3xl font-black uppercase tracking-[0.18em]">
            Unearth<span className="text-ember">self</span>
          </p>
          <p className="mt-2 text-xs tracking-[0.28em] text-fossil/45 uppercase">Desk</p>
        </div>
        {children}
      </div>
    </main>
  );
}
