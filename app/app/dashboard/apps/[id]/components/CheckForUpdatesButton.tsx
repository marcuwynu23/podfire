"use client";

import { useState, useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function CheckForUpdatesButton({
  serviceId,
  onTriggered,
  onMessage,
  compact,
}: {
  serviceId: string;
  onTriggered: () => void;
  onMessage?: (msg: string | null) => void;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const onTriggeredRef = useRef(onTriggered);

  useEffect(() => {
    onTriggeredRef.current = onTriggered;
  }, [onTriggered]);

  async function check() {
    setLoading(true);
    onMessage?.(null);
    try {
      const res = await fetch(`/api/services/${serviceId}/check-updates`, { method: "POST" });
      const data = (await res.json()) as { triggered?: boolean; message?: string };
      onMessage?.(data.message ?? (data.triggered ? "Deploy triggered." : "No new commits."));
      if (data.triggered) onTriggeredRef.current();
    } catch {
      onMessage?.("Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/services/${serviceId}/check-updates`, { method: "POST" });
        const data = (await res.json()) as { triggered?: boolean };
        if (data.triggered) onTriggeredRef.current();
      } catch {
        // ignore
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [serviceId]);

  return (
    <button
      type="button"
      onClick={check}
      disabled={loading}
      className={
        compact
          ? "rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-1.5 text-xs font-medium text-gl-text-muted transition hover:bg-gl-hover disabled:opacity-50"
          : "rounded-xl border border-gl-edge bg-gl-input-bg px-4 py-2.5 text-sm font-medium text-gl-text-muted transition hover:bg-gl-hover disabled:opacity-50"
      }
      title="Check branch for new commits and deploy if any (auto-deploy checks every 2 min while this page is open)"
    >
      {loading ? "Checking…" : "Check"}
    </button>
  );
}
