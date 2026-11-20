import { createServerFn } from "@tanstack/react-start";
import {
  clampMorningCount,
  DRAFT_REVISION,
  loadBook,
  saveBook,
  upsertCompany,
  type LeadsBook,
} from "@/lib/leads-book";
import { readCocoDesk, type CocoJoin } from "@/lib/hunter-outreach";
import { requireStaffSession } from "@/lib/staff-session";
import type { Company } from "@/lib/lead-score";

export type LeadsLoad =
  | { storage: "redis"; book: LeadsBook; coco: Record<string, CocoJoin> }
  | { storage: "browser"; book: null; coco: Record<string, CocoJoin> };

export const getLeadsBook = createServerFn({ method: "GET" }).handler(async (): Promise<LeadsLoad> => {
  await requireStaffSession();
  const loaded = await loadBook();
  if (loaded.storage === "browser") return { storage: "browser", book: null, coco: {} };
  let coco: Record<string, CocoJoin> = {};
  try {
    coco = await readCocoDesk(loaded.book.companies);
  } catch (error) {
    console.error("[leads] outreach join was not read", error instanceof Error ? error.name : "error");
  }
  return { storage: "redis", book: loaded.book, coco };
});

export const importLeadsCompanies = createServerFn({ method: "POST" })
  .validator((data: { companies: Company[] }) => data)
  .handler(async ({ data }): Promise<LeadsBook> => {
    await requireStaffSession();
    const loaded = await loadBook();
    if (loaded.storage !== "redis") throw new Error("Redis is not configured");
    if (loaded.book.companies.length > 0) return loaded.book;
    const next: LeadsBook = { ...loaded.book, companies: data.companies };
    await saveBook(next);
    return next;
  });

export const setLeadsMorningCount = createServerFn({ method: "POST" })
  .validator((data: { morningCount: number }) => data)
  .handler(async ({ data }): Promise<LeadsBook> => {
    await requireStaffSession();
    const loaded = await loadBook();
    if (loaded.storage !== "redis") throw new Error("Redis is not configured");
    const next: LeadsBook = { ...loaded.book, morningCount: clampMorningCount(data.morningCount) };
    await saveBook(next);
    return next;
  });

export const replaceLeadsCompanies = createServerFn({ method: "POST" })
  .validator((data: { companies: Company[]; draftRevision?: number }) => data)
  .handler(async ({ data }): Promise<LeadsBook> => {
    await requireStaffSession();
    const loaded = await loadBook();
    if (loaded.storage !== "redis") throw new Error("Redis is not configured");
    const next: LeadsBook = {
      ...loaded.book,
      companies: data.companies,
      draftRevision: data.draftRevision === DRAFT_REVISION ? DRAFT_REVISION : loaded.book.draftRevision,
    };
    await saveBook(next);
    return next;
  });

export const saveLeadsCompany = createServerFn({ method: "POST" })
  .validator((data: { company: Company; draftRevision?: number }) => data)
  .handler(async ({ data }): Promise<LeadsBook> => {
    await requireStaffSession();
    const loaded = await loadBook();
    if (loaded.storage !== "redis") throw new Error("Redis is not configured");
    const next = upsertCompany(loaded.book, data.company);
    if (data.draftRevision === DRAFT_REVISION) next.draftRevision = DRAFT_REVISION;
    await saveBook(next);
    return next;
  });
