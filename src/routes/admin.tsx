import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Shell } from "@/components/desk/Shell";
import { getStaffSession } from "@/lib/staff-session";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const staff = await getStaffSession();
    if (!staff) throw redirect({ to: "/login" });
    return { staff };
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
