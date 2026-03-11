"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeployButton({
  serviceId,
  currentStatus,
  compact,
}: {
  serviceId: string;
  currentStatus: string;
  compact?: boolean;
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

  const base =
    "bg-primary font-medium text-white transition hover:bg-primary-hover disabled:opacity-50";
  const sizeClass = compact
    ? "rounded-lg px-3 py-1.5 text-xs"
    : "rounded-xl px-4 py-2.5 shadow-sm";

  return (
    <button
      type="button"
      onClick={deploy}
      disabled={loading || busy}
      className={`${base} ${sizeClass}`}
      title={busy ? "Agent is processing this deployment" : "Queue a new deployment (agent will run it)"}
    >
      {loading ? "Queued…" : busy ? "Deploying…" : "Deploy"}
    </button>
  );
}
