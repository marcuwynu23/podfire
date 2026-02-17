"use client";

import { useState, useEffect } from "react";

export function LogsViewer({
  deploymentId,
  initialLogs,
}: {
  deploymentId: string;
  initialLogs: string | null;
}) {
  const [logs, setLogs] = useState(initialLogs ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 5;
    setFetchError(null);
    const poll = async () => {
      try {
        const url =
          typeof window !== "undefined"
            ? `${window.location.origin}/api/deployments/${deploymentId}`
            : `/api/deployments/${deploymentId}`;
        const res = await fetch(url, {
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (!res.ok) {
          setFetchError(`Could not load logs (${res.status})`);
          return;
        }
        const data = await res.json();
        setLogs(data.logs ?? "");
        setStatus(data.status);
        setFetchError(null);
        retryCount = 0;
        if (!["running", "failed"].includes(data.status)) {
          setTimeout(poll, 2000);
        }
      } catch (err) {
        if (cancelled) return;
        setFetchError(err instanceof Error ? err.message : "Failed to fetch logs");
        if (retryCount < maxRetries) {
          retryCount += 1;
          setTimeout(poll, 3000);
        }
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [deploymentId]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-4 text-lg font-medium text-white">
        Logs {status != null && <span className="text-zinc-500">({status})</span>}
      </h2>
      {fetchError && (
        <p className="mb-2 text-sm text-amber-400">{fetchError}</p>
      )}
      <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm text-zinc-300 whitespace-pre-wrap">
        {logs || "No logs yet."}
      </pre>
    </div>
  );
}
