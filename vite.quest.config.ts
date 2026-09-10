import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { cpSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

function copyFieldAssets() {
  return {
    name: "quest-field-assets",
    closeBundle() {
      const www = resolve("quest-native/www");
      const built = resolve(www, "quest-shell.html");
      const index = resolve(www, "index.html");
      if (existsSync(built)) renameSync(built, index);
      const copies: Array<[string, string]> = [
        ["public/fonts", "quest-native/www/fonts"],
        ["public/runes", "quest-native/www/runes"],
        ["public/quest", "quest-native/www/quest"],
      ];
      for (const [from, to] of copies) {
        if (!existsSync(from)) continue;
        mkdirSync(to, { recursive: true });
        cpSync(from, to, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [viteReact(), copyFieldAssets()],
  resolve: { tsconfigPaths: true },
  publicDir: false,
  build: {
    outDir: "quest-native/www",
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      input: resolve("quest-shell.html"),
    },
  },
});
