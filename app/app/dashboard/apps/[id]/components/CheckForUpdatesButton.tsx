"use client";

import { useState, useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function CheckForUpdatesButton({
  serviceId,
  onTriggered,
}: {
  serviceId: string;
  onTriggered: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const onTriggeredRef = useRef(onTriggered);
  onTriggeredRef.current = onTriggered;

  async function check() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/services/${serviceId}/check-updates`, { method: "POST" });
      const data = (await res.json()) as { triggered?: boolean; message?: string };
      setMessage(data.message ?? (data.triggered ? "Deploy triggered." : "No new commits."));
      if (data.triggered) onTriggeredRef.current();
    } catch {
      setMessage("Request failed");
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
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={check}
        disabled={loading}
        className="rounded-xl border border-gl-edge bg-gl-input-bg px-4 py-2.5 text-sm font-medium text-gl-text-muted transition hover:bg-gl-hover disabled:opacity-50"
        title="Check branch for new commits and deploy if any (auto-deploy checks every 2 min while this page is open)"
      >
        {loading ? "Checking…" : "Check for updates"}
      </button>
      {message && (
        <span className="text-xs text-gl-text-muted">{message}</span>
      )}
    </div>
  );
}
