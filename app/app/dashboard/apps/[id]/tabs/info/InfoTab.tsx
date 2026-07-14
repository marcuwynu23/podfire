"use client";

import { useState, useEffect, useRef } from "react";

type Props = {
  repoUrl: string;
  branch: string;
  stackName: string | null;
  currentReplicas: number;
  appUrl: string;
  status: string;
  warmingUp?: boolean;
};

function pingUrl(url: string, signal: AbortSignal): Promise<boolean> {
  return fetch(url, { method: "HEAD", signal, mode: "no-cors" })
    .then(() => true)
    .catch(() => false);
}

export function InfoTab({ repoUrl, branch, stackName, currentReplicas, appUrl, status, warmingUp }: Props) {
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    const controller = new AbortController();

    async function poll() {
      while (!cancelled) {
        const ok = await pingUrl(appUrl, controller.signal);
        if (ok && mountedRef.current) {
          setReady(true);
          return;
        }
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    poll();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      controller.abort();
    };
  }, [appUrl]);

  const loading = status !== "running" && (warmingUp || !ready);

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-base font-semibold text-gl-text">Information</h2>
      <p className="mt-0.5 text-sm text-gl-text-muted">
        Repository and runtime details for this app.
      </p>
      <dl className="mt-4 grid gap-4 sm:mt-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            Repository
          </dt>
          <dd className="mt-1 font-mono text-sm text-gl-text-muted break-all">{repoUrl}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            Branch
          </dt>
          <dd className="mt-1 font-mono text-sm text-gl-text-muted">{branch}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            Stack name
          </dt>
          <dd className="mt-1 font-mono text-sm text-gl-text-muted">{stackName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            Scale (replicas)
          </dt>
          <dd className="mt-1 font-mono text-sm text-gl-text-muted">{currentReplicas}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            App URL
          </dt>
          <dd className="mt-1">
            {loading ? (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gl-edge">
                  <div className="h-full w-full animate-pulse rounded-full bg-primary" style={{ animationDuration: "2s" }} />
                </div>
                <p className="text-xs text-gl-text-muted">
                  {warmingUp ? "Warming up — app is starting…" : `Checking — pinging ${appUrl}…`}
                </p>
              </div>
            ) : (
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-primary hover:underline"
              >
                {appUrl}
              </a>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
