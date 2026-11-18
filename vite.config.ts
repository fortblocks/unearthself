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
              config: {
                crons: [
                  { path: "/api/cron/leads-scout", schedule: "0 11 * * *" },
                  // Pro allows once a minute. The hunter stops itself after its daily call cap.
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
