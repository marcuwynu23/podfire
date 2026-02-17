"use client";

import { useState, useEffect } from "react";

export function LogsViewer({
  deploymentId,
  initialLogs,
  embedded,
}: {
  deploymentId: string;
  initialLogs: string | null;
  embedded?: boolean;
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

  const content = (
    <>
      {fetchError && (
        <p className="mb-3 text-sm text-amber-400">{fetchError}</p>
      )}
      <pre className="max-h-96 overflow-auto rounded-native-sm border border-white/[0.06] bg-black/20 p-4 font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
        {logs || "No logs yet."}
      </pre>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <section className="rounded-native border border-white/[0.06] bg-gl-card shadow-sm">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <h2 className="text-base font-semibold text-white">
          Logs {status != null && <span className="font-normal text-zinc-500">({status})</span>}
        </h2>
      </div>
      <div className="p-6">{content}</div>
    </section>
  );
}
