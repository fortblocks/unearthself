"use client";

import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useQuest } from "@/lib/quest/store";

export function RequireGuest({ children }: { children: ReactNode }) {
  const ready = useQuest((s) => s.ready);
  const role = useQuest((s) => s.session.role);
  const privacy = useQuest((s) => s.progress.privacyAccepted);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (role === "facilitator") void navigate({ to: "/quest/admin" });
    else if (!role) void navigate({ to: "/quest" });
  }, [ready, role, navigate]);

  if (!ready || role !== "guest") return <p className="quest-loading">Orienting…</p>;
  if (!privacy) {
    void navigate({ to: "/quest" });
    return null;
  }
  return <>{children}</>;
}

export function RequireFacilitator({ children }: { children: ReactNode }) {
  const ready = useQuest((s) => s.ready);
  const role = useQuest((s) => s.session.role);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (role !== "facilitator") void navigate({ to: "/quest" });
  }, [ready, role, navigate]);

  if (!ready || role !== "facilitator") return <p className="quest-loading">Orienting…</p>;
  return <>{children}</>;
}
