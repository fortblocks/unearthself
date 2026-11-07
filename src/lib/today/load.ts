import type { SectionResult } from "./types.ts";

/**
 * Run section loaders together. A throw becomes that section's error and does not reject the others.
 */
export async function loadIndependent<T extends Record<string, () => Promise<SectionResult<unknown>>>>(
  loaders: T,
): Promise<{ [K in keyof T]: SectionResult<unknown> }> {
  const entries = await Promise.all(
    (Object.entries(loaders) as [keyof T, T[keyof T]][]).map(async ([key, load]) => {
      try {
        return [key, await load()] as const;
      } catch (error) {
        const message = error instanceof Error ? error.message : "This section failed.";
        return [key, { ok: false as const, mode: "live" as const, error: message }] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as { [K in keyof T]: SectionResult<unknown> };
}

export function sectionError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
