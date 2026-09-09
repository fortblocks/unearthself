"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Treatment } from "@/data/treatments";

export type BookLine = {
  key: string;
  treatmentId: string;
  name: string;
  mins: string;
  price: number;
  date: string;
  time: string;
};

export type CheckoutMode = "guest" | "member";
export type BookFace = "bootcamp" | "basecamp" | "haven";

type BookingState = {
  open: boolean;
  setOpen: (v: boolean) => void;
  face: BookFace | null;
  setFace: (f: BookFace | null) => void;
  openFace: (f: BookFace | null) => void;
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
  const [face, setFace] = useState<BookFace | null>(null);
  const [lines, setLines] = useState<BookLine[]>([]);
  const [mode, setMode] = useState<CheckoutMode>("guest");

  const openFace = useCallback((f: BookFace | null) => {
    setFace(f);
    setOpen(true);
  }, []);

  const addTreatment = useCallback((t: Treatment) => {
    setLines((prev) => [
      ...prev,
      {
        key: `${t.id}-${Date.now()}`,
        treatmentId: t.id,
        name: t.name,
        mins: t.mins,
        price: t.price,
        date: "",
        time: "",
      },
    ]);
    setFace("basecamp");
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
    () => ({
      open,
      setOpen,
      face,
      setFace,
      openFace,
      lines,
      addTreatment,
      removeLine,
      updateLine,
      clear,
      mode,
      setMode,
    }),
    [open, face, openFace, lines, addTreatment, removeLine, updateLine, clear, mode],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must sit inside BookingProvider");
  return ctx;
}
