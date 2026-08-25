import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BuilderShell } from "@/components/builder/BuilderShell";

export const Route = createFileRoute("/builder")({ component: BuilderPage });

function BuilderPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div className="builder-page pt-20">
      {ready ? (
        <BuilderShell />
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-24 text-shale">Loading retreat builder…</div>
      )}
    </div>
  );
}
