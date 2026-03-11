"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function LogsViewer({
  deploymentId,
  initialLogs,
  embedded,
}: {
  deploymentId: string;
  initialLogs: string | null;
  embedded?: boolean;
}) {
  const preClassName = embedded
    ? "scrollbar-deployment min-h-0 flex-1 overflow-auto rounded-native-sm border border-gl-edge bg-gl-input-bg p-4 font-mono text-sm leading-relaxed text-gl-text-muted whitespace-pre-wrap"
    : "logs-viewer-scroll max-h-96 overflow-auto rounded-native-sm border border-gl-edge bg-gl-input-bg p-4 font-mono text-sm leading-relaxed text-gl-text-muted whitespace-pre-wrap";
  const [logs, setLogs] = useState(initialLogs ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const wasAtBottomRef = useRef(true);

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

  // Track recent log: scroll to bottom when logs update so the latest line is visible
  useEffect(() => {
    if (!preRef.current || !logs) return;
    if (!wasAtBottomRef.current) return;
    const el = preRef.current;
    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(() => {
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    });
  }, [logs]);

  const handleScroll = useCallback(() => {
    if (!preRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = preRef.current;
    wasAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
  }, []);

  const content = (
    <>
      {fetchError && (
        <p className="mb-3 text-sm text-amber-400">{fetchError}</p>
      )}
      <pre
        ref={preRef}
        onScroll={handleScroll}
        className={preClassName}
      >
        {logs || "No logs yet."}
      </pre>
    </>
  );

  if (embedded) {
    return <div className="flex min-h-0 flex-1 flex-col">{content}</div>;
  }

  return (
    <section className="rounded-native border border-gl-edge bg-gl-card shadow-sm">
      <div className="border-b border-gl-edge px-6 py-4">
        <h2 className="text-base font-semibold text-gl-text">
          Logs {status != null && <span className="font-normal text-gl-text-muted">({status})</span>}
        </h2>
      </div>
      <div className="p-6">{content}</div>
    </section>
  );
}
