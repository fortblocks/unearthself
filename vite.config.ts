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
                "/api/cron/leads-scout": { maxDuration: 300 },
              },
              config: {
                crons: [
                  // 4am Edmonton. Both UTC hours are scheduled. The route runs only when local time is 4am, once per Edmonton day.
                  { path: "/api/cron/leads-scout", schedule: "0 10 * * *" },
                  { path: "/api/cron/leads-scout", schedule: "0 11 * * *" },
                  // Every 30 minutes. Working hours are gated in code, America/Edmonton, so daylight saving does not move them.
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
