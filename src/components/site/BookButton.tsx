"use client";

import { useRouterState } from "@tanstack/react-router";
import { useBooking, type BookFace } from "@/lib/booking/context";

function faceFromPath(pathname: string): BookFace | null {
  if (pathname.startsWith("/haven")) return "haven";
  if (pathname.startsWith("/basecamp")) return "basecamp";
  if (pathname.startsWith("/bootcamp") || pathname.startsWith("/for") || pathname.startsWith("/book")) {
    return "bootcamp";
  }
  return null;
}

export function BookButton() {
  const { openFace, lines } = useBooking();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const n = lines.length;

  return (
    <button
      type="button"
      onClick={() => openFace(faceFromPath(pathname))}
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
