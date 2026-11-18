import { createServerFn } from "@tanstack/react-start";
import { readHunterDesk, writeHunterPaused } from "@/lib/leads-hunter";
import { requireStaffSession } from "@/lib/staff-session";

export const getHunterDesk = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaffSession();
  return readHunterDesk();
});

export const setHunterPaused = createServerFn({ method: "POST" })
  .validator((data: { paused: boolean }) => data)
  .handler(async ({ data }) => {
    await requireStaffSession();
    return writeHunterPaused(data.paused === true);
  });
