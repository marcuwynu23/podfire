"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeployButton({
  serviceId,
  currentStatus,
}: {
  serviceId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const busy = ["queued", "building", "pushing", "deploying"].includes(currentStatus);

  async function deploy() {
    setLoading(true);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deploy failed");
      router.refresh();
    } catch {
      // error could be shown via toast
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deploy}
      disabled={loading || busy}
      className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      title={busy ? "Agent is processing this deployment" : "Queue a new deployment (agent will run it)"}
    >
      {loading ? "Queued…" : busy ? "Deploying…" : "Deploy"}
    </button>
  );
}
