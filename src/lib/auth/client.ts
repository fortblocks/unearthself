import { staffLogout } from "@/lib/staff-session";

export async function signOut(redirectTo = "/login"): Promise<void> {
  await staffLogout();
  if (typeof window !== "undefined") window.location.href = redirectTo;
}
