import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { LoginFrame } from "@/components/desk/Mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStaffSession, staffLogin } from "@/lib/staff-session";
import { STAFF_EMAIL } from "@/lib/staff";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const staff = await getStaffSession();
    if (staff) throw redirect({ to: "/admin" });
  },
  component: LoginPage,
  head: () => ({ meta: [{ title: "Desk — Unearth Self" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      const result = await staffLogin({
        data: {
          email: String(data.get("email") || "").trim(),
          password: String(data.get("password") || "").trim(),
        },
      });
      if (!result.ok) {
        setError("That is not the desk.");
        setBusy(false);
        return;
      }
      await navigate({ to: "/admin" });
    } catch {
      setError("That is not the desk.");
      setBusy(false);
    }
  }

  return (
    <LoginFrame>
      <form onSubmit={onSubmit} className="grid gap-4">
        <label>
          <Label className="text-sandstone">Email</Label>
          <Input
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            defaultValue={STAFF_EMAIL}
            className="desk-field"
          />
        </label>
        <label>
          <Label className="text-sandstone">Password</Label>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className="desk-field"
          />
        </label>
        {error ? <p className="text-sm text-ember">{error}</p> : null}
        <Button type="submit" disabled={busy} className="mt-2 w-full">
          {busy ? "Entering…" : "Enter"}
        </Button>
      </form>
    </LoginFrame>
  );
}
