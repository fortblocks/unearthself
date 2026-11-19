/**
 * Nitro's server bundle can emit an SSR entry that exports `ssr_exports`
 * without defining it. Node then refuses to load the module and every page
 * returns 500. The fetch handler is `server_default`. Point the entry's `a`
 * export at that handler. If the bad name is absent, leave the file alone.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../.vercel/output/functions/", import.meta.url);

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (entry.name !== "ssr.mjs" || !path.endsWith(`${join("_ssr", "ssr.mjs")}`)) continue;
    const text = await readFile(path, "utf8");
    if (!text.includes("ssr_exports") && !text.includes("var __exportAll =")) continue;
    let next = text;
    if (next.includes("ssr_exports")) {
      if (!next.includes("server_default")) {
        throw new Error(`SSR entry names ssr_exports but has no server_default: ${path}`);
      }
      next = next.replaceAll("ssr_exports as a", "server_default as a");
      if (next.includes("ssr_exports")) throw new Error(`SSR entry still names ssr_exports: ${path}`);
    }
    const helper = /var __exportAll = \(all, no_symbols\) => \{[\s\S]*?\n\};/;
    if (helper.test(next)) {
      next = next.replace(
        helper,
        `function __exportAll(all, no_symbols) {
	const defProp = Object.defineProperty;
	let target = {};
	for (var name in all) defProp(target, name, { get: all[name], enumerable: true });
	if (!no_symbols) defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
}`,
      );
    }
    if (next === text) continue;
    await writeFile(path, next);
  }
}

await walk(root.pathname);
