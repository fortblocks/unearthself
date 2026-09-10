import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { readyNativeShell } from "@/lib/quest/native";
import { QuestNativeApp } from "@/native/router";
import "@/styles.quest.css";

void readyNativeShell();

const el = document.getElementById("quest-root");
 if (!el) throw new Error("quest-root missing");

createRoot(el).render(
  <StrictMode>
    <QuestNativeApp />
  </StrictMode>,
);
