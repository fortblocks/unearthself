"use client";

import { useNavigate } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";

const shell: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#161718",
  color: "#F8F0ED",
  zIndex: 40,
  display: "flex",
  flexDirection: "column",
  paddingTop: "env(safe-area-inset-top)",
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: "calc(0.7rem + env(safe-area-inset-top))",
  right: "0.9rem",
  width: "2.75rem",
  height: "2.75rem",
  border: "1px solid rgba(248,240,237,0.28)",
  background: "transparent",
  color: "#F8F0ED",
  fontSize: "1.35rem",
  zIndex: 2,
  WebkitAppearance: "none",
};

export function QuestStage({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  const navigate = useNavigate();
  return (
    <div style={shell}>
      <button type="button" style={closeBtn} aria-label="Close" onClick={() => (onClose ? onClose() : void navigate({ to: "/quest/today" }))}>
        ×
      </button>
      {children}
    </div>
  );
}
