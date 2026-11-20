import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, isPreview }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            vercel: {
              functionRules: {
                "/api/cron/leads-hunter": { maxDuration: 300 },
              },
              config: {
                crons: [
                  // Every 30 minutes. Working hours are gated in code, America/Edmonton, so daylight saving does not move them.
                  // The 4am nightly sweep was removed on 20th November 2026.
                  { path: "/api/cron/leads-hunter", schedule: "*/30 * * * *" },
                ],
              },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
