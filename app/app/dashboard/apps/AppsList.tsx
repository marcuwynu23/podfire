"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Deployment = { id: string; status: string; createdAt: Date | string };
type Service = {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  deployments: Deployment[];
};

function StatusPill({ status }: { status: string }) {
  const s = status === "—" ? "idle" : status;
  const styles: Record<string, string> = {
    running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    stopped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
    building: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    pushing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    deploying: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    queued: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    idle: "bg-zinc-500/10 text-zinc-500 border-white/10",
  };
  const style = styles[s] ?? styles.idle;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {s === "idle" ? "—" : s}
    </span>
  );
}

function RepoSlug(repoUrl: string) {
  try {
    const u = new URL(repoUrl);
    const path = u.pathname.replace(/\.git$/, "").replace(/^\//, "");
    return path || repoUrl;
  } catch {
    return repoUrl;
  }
}

const POLL_INTERVAL_MS = 10_000;

export function AppsList({ services }: { services: Service[] }) {
  const [statusById, setStatusById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (services.length === 0) return;

    function fetchAll() {
      services.forEach((s) => {
        fetch(`/api/services/${s.id}/status?live=1`, { cache: "no-store" })
          .then((res) => res.json())
          .then((data: { status?: string }) => {
            const status = data.status ?? "—";
            setStatusById((prev) => (prev[s.id] === status ? prev : { ...prev, [s.id]: status }));
          })
          .catch(() => {});
      });
    }

    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [services]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => {
        const status = statusById[s.id] ?? s.deployments[0]?.status ?? "—";
        const repoSlug = RepoSlug(s.repoUrl);
        return (
          <Link
            key={s.id}
            href={`/dashboard/apps/${s.id}`}
            className="group rounded-native border border-white/[0.06] bg-gl-card p-5 shadow-sm transition hover:border-primary/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-white group-hover:text-primary">
                  {s.name}
                </h2>
                <p className="mt-0.5 truncate text-xs text-zinc-500" title={repoSlug}>
                  {repoSlug}
                </p>
              </div>
              <StatusPill status={status} />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>{s.branch}</span>
              {s.deployments[0]?.createdAt && (
                <span>
                  {new Date(s.deployments[0].createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
              View app
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
