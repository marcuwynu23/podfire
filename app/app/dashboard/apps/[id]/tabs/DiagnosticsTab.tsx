"use client";

import { useState } from "react";
import type { DiagnosticsResult } from "./types";

export function ServiceDiagnosticsBlock({ serviceId }: { serviceId: string }) {
  const [result, setResult] = useState<DiagnosticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  async function runDiagnostics() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/diagnostics`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          (data as { error?: string }).error ?? "Failed to run diagnostics"
        );
        return;
      }
      const d = (data as { diagnostics?: DiagnosticsResult }).diagnostics;
      if (d) setResult(d);
      else setError("No diagnostics data returned");
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  const verdictColor =
    result?.verdict === "ok"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : result?.verdict === "container_not_serving"
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : result?.verdict === "traefik_routing"
          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
          : result?.verdict === "service_not_found"
            ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
            : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";

  return (
    <section className="mt-8 rounded-native border border-white/[0.06] p-4">
      <h3 className="text-sm font-medium text-white">Service diagnostics</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Inspect the deployed service: container reachability (curl) and Traefik
        routing. Run after deploy to verify.
      </p>
      <button
        type="button"
        onClick={runDiagnostics}
        disabled={loading}
        className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2 text-sm font-medium text-zinc-300 shadow-sm transition hover:bg-white/[0.08] disabled:opacity-50"
      >
        {loading ? "Running diagnostics…" : "Run diagnostics"}
      </button>
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Verdict
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${verdictColor}`}
            >
              {result.verdict.replace(/_/g, " ")}
            </span>
            {result.containerHttpStatus != null && (
              <span className="text-xs text-zinc-500">
                HTTP {result.containerHttpStatus}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-300">{result.summary}</p>
          <div>
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {detailsOpen ? "Hide" : "Show"} details (service tasks, Traefik
              logs)
            </button>
            {detailsOpen && (
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium text-zinc-500">
                    Service tasks
                  </p>
                  <pre className="mt-1 max-h-32 overflow-auto rounded border border-white/[0.06] bg-black/20 p-2 font-mono text-xs text-zinc-400 whitespace-pre-wrap">
                    {result.serviceTasksSummary || "(none)"}
                  </pre>
                </div>
                {result.containerCurlError && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500">
                      Curl error
                    </p>
                    <pre className="mt-1 max-h-20 overflow-auto rounded border border-white/[0.06] bg-black/20 p-2 font-mono text-xs text-amber-300/90 whitespace-pre-wrap">
                      {result.containerCurlError}
                    </pre>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-zinc-500">
                    Traefik logs (tail)
                  </p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded border border-white/[0.06] bg-black/20 p-2 font-mono text-xs text-zinc-400 whitespace-pre-wrap">
                    {result.traefikLogs || "(no logs)"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
