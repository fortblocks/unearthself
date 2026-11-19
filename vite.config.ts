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
                  // Hunter nightly local sweep. Path kept so this cron is not registered twice.
                  { path: "/api/cron/leads-scout", schedule: "0 11 * * *" },
                  // Hunter always-on hunt. Pro allows once a minute. It stops at 48 contact-ready cards, or when the model-call budget runs out.
                  { path: "/api/cron/leads-hunter", schedule: "* * * * *" },
                ],
              },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
