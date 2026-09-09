"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Treatment } from "@/data/treatments";

export type BookLine = {
  key: string;
  treatmentId: string;
  name: string;
  mins: string;
  date: string;
  time: string;
};

export type CheckoutMode = "guest" | "member";

type BookingState = {
  open: boolean;
  setOpen: (v: boolean) => void;
  lines: BookLine[];
  addTreatment: (t: Treatment) => void;
  removeLine: (key: string) => void;
  updateLine: (key: string, patch: Partial<Pick<BookLine, "date" | "time">>) => void;
  clear: () => void;
  mode: CheckoutMode;
  setMode: (m: CheckoutMode) => void;
};

const BookingContext = createContext<BookingState | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<BookLine[]>([]);
  const [mode, setMode] = useState<CheckoutMode>("guest");

  const addTreatment = useCallback((t: Treatment) => {
    setLines((prev) => [
      ...prev,
      {
        key: `${t.id}-${Date.now()}`,
        treatmentId: t.id,
        name: t.name,
        mins: t.mins,
        date: "",
        time: "",
      },
    ]);
    setOpen(true);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<Pick<BookLine, "date" | "time">>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ open, setOpen, lines, addTreatment, removeLine, updateLine, clear, mode, setMode }),
    [open, lines, addTreatment, removeLine, updateLine, clear, mode],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must sit inside BookingProvider");
  return ctx;
}
