"use client";

import { useState, useEffect, useRef } from "react";

export function AppLogsViewer({
  serviceId,
  live = false,
}: {
  serviceId: string;
  /** When true, stream logs via SSE in real time. */
  live?: boolean;
}) {
  const [logs, setLogs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const wasAtBottomRef = useRef(true);

  useEffect(() => {
    if (!live) return;

    const es = new EventSource(`/api/services/${serviceId}/logs/stream`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as {
          logs?: string | null;
          lines?: string | null;
          append?: boolean;
          error?: string | null;
        };
        if (data.error) {
          setError(data.error);
          return;
        }
        if (data.append) {
          // Append-only delta
          if (data.lines) {
            setLogs((prev) => (prev ?? "") + data.lines! + "\n");
            setError(null);
          }
        } else {
          // Full replace (initial load or reconnect)
          setLogs(data.logs ?? null);
          setError(null);
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; show a subtle error after prolonged failure
      setError("Connection lost — reconnecting…");
    };

    return () => {
      es.close();
    };
  }, [live, serviceId]);

  // Track recent log: scroll to bottom when logs update (after layout). If user scrolled up, keep their position.
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

  const handleScroll = () => {
    if (!preRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = preRef.current;
    wasAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  return (
    <div className="flex min-h-[32rem] flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gl-text-muted">
          {live
            ? "Real-time output from the running container (stdout/stderr)."
            : "Live output from the running container (stdout/stderr). Redeploy to apply changes."}
        </p>
      </div>
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
      <pre
        ref={preRef}
        onScroll={handleScroll}
        className="scrollbar-thin mt-3 min-h-[28rem] max-h-[36rem] overflow-auto rounded-native-sm border border-gl-edge bg-gl-input-bg p-4 font-mono text-sm leading-relaxed text-gl-text-muted whitespace-pre-wrap"
      >
        {logs ?? "Connecting to log stream…"}
      </pre>
    </div>
  );
}
