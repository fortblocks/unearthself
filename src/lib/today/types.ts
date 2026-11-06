export type SourceMode = "sample" | "live";

export type SectionResult<T> =
  | { ok: true; mode: SourceMode; data: T }
  | { ok: false; mode: SourceMode; error: string };

export type LeadDirection = "inbound" | "outbound";
