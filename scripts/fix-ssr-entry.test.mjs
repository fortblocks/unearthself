import assert from "node:assert/strict";
import test from "node:test";
import { repairSsrEntry } from "./fix-ssr-entry.mjs";

const BROKEN = `import { a as server_default, i as getServerFnById, n as createServerEntry, o as server_exports, r as createServerFn, t as TSS_SERVER_FUNCTION } from "./ssr2.mjs";
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) {
		__defProp(target, name, { get: all[name], enumerable: true });
	}
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
export { ssr_exports as a, createServerEntry, server_default as default, getServerFnById as i, createServerFn as n, __exportAll as o, TSS_SERVER_FUNCTION as r, server_exports as t };
`;

test("defines the missing SSR namespace and keeps the cookie export on it", () => {
  const next = repairSsrEntry(BROKEN);
  assert.match(next, /function __exportAll\(all, no_symbols\)/);
  assert.doesNotMatch(next, /var __exportAll =/);
  assert.match(next, /export \{ ssr_exports as a,/);
  assert.match(next, /var ssr_exports = __exportAll\(\{[\s\S]*default: \(\) => server_default[\s\S]*t: \(\) => server_exports[\s\S]*\}\);/);
  assert.doesNotMatch(next, /server_default as a/);
});

test("leaves a bundle that already defines ssr_exports alone", () => {
  const once = repairSsrEntry(BROKEN);
  assert.equal(repairSsrEntry(once), once);
});

test("leaves an entry that never mentions ssr_exports alone, aside from the helper", () => {
  const healthy = BROKEN.replace("ssr_exports as a", "server_default as a");
  const next = repairSsrEntry(healthy);
  assert.match(next, /function __exportAll/);
  assert.doesNotMatch(next, /var ssr_exports/);
});
