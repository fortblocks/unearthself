"use client";

import { useBooking } from "@/lib/booking/context";

export function BookButton() {
  const { setOpen, lines } = useBooking();
  const n = lines.length;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative rounded-[2px] bg-ember px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white hover:bg-ember-soft"
    >
      Book
      {n > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fossil px-1 text-[0.65rem] font-semibold text-coal">
          {n}
        </span>
      )}
    </button>
  );
}
