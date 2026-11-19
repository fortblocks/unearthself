/**
 * Nitro rebundles the Vite SSR entry into a facade chunk, ssr.mjs, plus
 * ssr2.mjs. The facade is supposed to export `ssr_exports as a`, where
 * `ssr_exports` is the original entry's module namespace. Rolldown names
 * that binding in the export and never declares it. Node then refuses to
 * load the module (Export 'ssr_exports' is not defined) and every page 500s.
 *
 * Callers use that namespace, not the fetch handler:
 *   import(ssr).then((n) => n.a)            renderer, then n.default.fetch
 *   import(ssr).then((n) => n.a).then((n) => n.t)   getCookie / setCookie
 * `t` is the cookie module. Pointing `a` at the fetch handler makes public
 * pages render and leaves `n.a.t` undefined, which is the admin 500.
 *
 * ssr2.mjs also imports `__exportAll` from this facade and calls it while
 * the facade is still evaluating. A `var` helper is in the temporal dead
 * zone then. A function declaration is already initialized.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../.vercel/output/functions/", import.meta.url);

const HELPER = /var __exportAll = \(all, no_symbols\) => \{[\s\S]*?\n\};/;

const HELPER_FN = `function __exportAll(all, no_symbols) {
	const defProp = Object.defineProperty;
	let target = {};
	for (var name in all) defProp(target, name, { get: all[name], enumerable: true });
	if (!no_symbols) defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
}`;

export function repairSsrEntry(text) {
  let next = text;
  if (HELPER.test(next)) next = next.replace(HELPER, HELPER_FN);
  if (!next.includes("ssr_exports")) return next === text ? text : next;
  if (/\b(?:var|let|const|function)\s+ssr_exports\b/.test(next)) {
    if (next.includes("ssr_exports") && !next.includes("function __exportAll")) {
      throw new Error("SSR entry names ssr_exports but __exportAll is not a function declaration");
    }
    return next;
  }
  const exportMatch = next.match(/export \{[^}]*\bssr_exports as a\b[^}]*\};/);
  if (!exportMatch) throw new Error("SSR entry names ssr_exports but has no `ssr_exports as a` export");
  if (!next.includes("function __exportAll")) {
    throw new Error("SSR entry names ssr_exports but __exportAll is not a function declaration");
  }
  const inner = exportMatch[0].slice(exportMatch[0].indexOf("{") + 1, exportMatch[0].lastIndexOf("}"));
  const fields = [];
  for (const part of inner.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const alias = trimmed.match(/^(\w+)\s+as\s+(\w+)$/);
    if (alias) {
      const [, local, exported] = alias;
      if (local === "ssr_exports") continue;
      fields.push(`\t${exported}: () => ${local}`);
      continue;
    }
    if (!/^\w+$/.test(trimmed)) throw new Error(`SSR entry has an unreadable export: ${trimmed}`);
    fields.push(`\t${trimmed}: () => ${trimmed}`);
  }
  if (!fields.some((field) => field.startsWith("\tt: () => "))) {
    throw new Error("SSR entry namespace has no t export for the cookie helpers");
  }
  if (!fields.some((field) => field.startsWith("\tdefault: () => "))) {
    throw new Error("SSR entry namespace has no default export for the fetch handler");
  }
  const declaration = `var ssr_exports = __exportAll({\n${fields.join(",\n")}\n});\n`;
  next = next.replace(exportMatch[0], `${declaration}${exportMatch[0]}`);
  if (!next.includes("var ssr_exports = __exportAll(")) {
    throw new Error("SSR entry still does not define ssr_exports");
  }
  return next;
}

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
    const next = repairSsrEntry(text);
    if (next === text) continue;
    await writeFile(path, next);
  }
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href;
if (isMain) await walk(root.pathname);
