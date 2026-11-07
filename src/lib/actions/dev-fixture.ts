/** True when the query asks for the labelled fixture, ignoring the dev gate. */
export function searchRequestsFixture(search: string): boolean {
  const q = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(q).get("fixture") === "sample";
}

/**
 * Local dev only. `?fixture=sample` shows the labelled fixture.
 * Production builds drop this because import.meta.env.DEV is false.
 */
export function devFixtureRequested(search: string): boolean {
  if (!import.meta.env?.DEV) return false;
  return searchRequestsFixture(search);
}
