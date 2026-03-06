"use client";

import {useState, useCallback, useEffect} from "react";

const DASHBOARD_URL = "http://traefik.localhost";

type Status = "idle" | "checking" | "running" | "stopped" | "error";

export function GatewayStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("checking");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/traefik/status", {cache: "no-store"});
      const data = (await res.json()) as {running?: boolean; error?: string};
      if (data.error && !data.running) {
        setStatus("error");
        setErrorMessage(data.error);
      } else if (data.running) {
        setStatus("running");
      } else {
        setStatus("stopped");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach server");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Status</h2>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={status === "checking"}
          className="text-sm text-zinc-400 hover:text-white disabled:opacity-50"
        >
          {status === "checking" ? "Checking…" : "Refresh"}
        </button>
      </div>
      <div className="mt-3">
        {status === "checking" && (
          <p className="text-sm text-zinc-500">Checking…</p>
        )}
        {status === "running" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Running
            </span>
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline hover:text-primary/80"
            >
              Open dashboard
            </a>
          </div>
        )}
        {status === "stopped" && (
          <p className="text-sm text-zinc-400">
            Gateway is not deployed. Deploy it below to route traffic to your
            apps.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-amber-400">
            {errorMessage ??
              "Unable to determine status. Ensure an agent is connected."}
          </p>
        )}
      </div>
    </div>
  );
}
