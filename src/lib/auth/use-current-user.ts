import { STAFF_EMAIL } from "@/lib/staff";

export function useCurrentUser() {
  return {
    id: "staff",
    displayName: "Desk",
    primaryEmail: STAFF_EMAIL,
    profileImageUrl: null,
    isDevFallback: false,
  };
}

export function useCurrentUserState() {
  return { user: useCurrentUser(), isPending: false };
}
