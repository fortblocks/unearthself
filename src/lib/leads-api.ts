import { createServerFn } from "@tanstack/react-start";
import {
  clampMorningCount,
  loadBook,
  saveBook,
  upsertCompany,
  type LeadsBook,
} from "@/lib/leads-book";
import { requireStaffSession } from "@/lib/staff-session";
import type { Company } from "@/lib/lead-score";

export type LeadsLoad =
  | { storage: "redis"; book: LeadsBook }
  | { storage: "browser"; book: null };

export const getLeadsBook = createServerFn({ method: "GET" }).handler(async (): Promise<LeadsLoad> => {
  await requireStaffSession();
  const loaded = await loadBook();
  if (loaded.storage === "browser") return { storage: "browser", book: null };
  return { storage: "redis", book: loaded.book };
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
  .validator((data: { companies: Company[] }) => data)
  .handler(async ({ data }): Promise<LeadsBook> => {
    await requireStaffSession();
    const loaded = await loadBook();
    if (loaded.storage !== "redis") throw new Error("Redis is not configured");
    const next: LeadsBook = { ...loaded.book, companies: data.companies };
    await saveBook(next);
    return next;
  });

export const saveLeadsCompany = createServerFn({ method: "POST" })
  .validator((data: { company: Company }) => data)
  .handler(async ({ data }): Promise<LeadsBook> => {
    await requireStaffSession();
    const loaded = await loadBook();
    if (loaded.storage !== "redis") throw new Error("Redis is not configured");
    const next = upsertCompany(loaded.book, data.company);
    await saveBook(next);
    return next;
  });
