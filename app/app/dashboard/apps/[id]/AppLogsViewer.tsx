"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const FETCH_TIMEOUT_MS = 8000;
const LIVE_POLL_INTERVAL_MS = 3000;

export function AppLogsViewer({
  serviceId,
  live = false,
}: {
  serviceId: string;
  /** When true, poll logs every few seconds for a live stream (no manual refresh). */
  live?: boolean;
}) {
  const [logs, setLogs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const wasAtBottomRef = useRef(true);

  const fetchLogs = useCallback(async () => {
    setError(null);
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`/api/services/${serviceId}/logs`, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = (await res.json()) as { logs?: string | null; error?: string | null };
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to load logs");
        setLogs(null);
        return;
      }
      setLogs(data.logs ?? null);
      if (data.error) setError(String(data.error));
    } catch (err) {
      clearTimeout(timeoutId);
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out. Start the agent gateway and agent, then try Refresh."
          : "Failed to fetch app logs";
      setError(message);
      setLogs(null);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  // Live polling: fetch on mount and every N seconds when live=true
  useEffect(() => {
    fetchLogs();
    if (!live) return;
    const interval = setInterval(fetchLogs, LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [live, serviceId, fetchLogs]);

  // Keep scroll at bottom when we're already at bottom and logs update
  useEffect(() => {
    if (!preRef.current || !logs || !wasAtBottomRef.current) return;
    preRef.current.scrollTop = preRef.current.scrollHeight;
  }, [logs]);

  const handleScroll = useCallback(() => {
    if (!preRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = preRef.current;
    wasAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">
          {live
            ? "Live output from the running container (stdout/stderr). Updates every few seconds."
            : "Live output from the running container (stdout/stderr). Redeploy to apply changes."}
        </p>
        <button
          type="button"
          onClick={() => fetchLogs()}
          disabled={loading}
          className="rounded-native-sm border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
      <pre
        ref={preRef}
        onScroll={handleScroll}
        className="mt-3 max-h-80 overflow-auto rounded-native-sm border border-white/[0.06] bg-black/20 p-4 font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap"
      >
        {logs ?? (loading ? "Loading…" : "Loading runtime logs…")}
      </pre>
    </div>
  );
}
