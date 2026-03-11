"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  tabs,
  type TabId,
  type ServiceWithDeployments,
  type Deployment,
  DEPLOY_STATUS_POLL_MS,
  LIVE_STATUS_POLL_MS,
  BUSY_STATUSES,
  StatusPill,
  InfoTab,
  DeploymentsTab,
  LogsTab,
  ServiceDiagnosticsBlock,
  SettingsPanel,
} from "./tabs";
import { DeployButton } from "./components/DeployButton";
import { CheckForUpdatesButton } from "./components/CheckForUpdatesButton";

export function AppDetailTabs({
  service,
  deployments,
  latestDeployment,
}: {
  service: ServiceWithDeployments;
  deployments: Deployment[];
  latestDeployment: Deployment | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const serverStatus = latestDeployment?.status ?? "—";
  const [polledStatus, setPolledStatus] = useState<string | null>(null);
  const status = polledStatus ?? serverStatus;
  const baseHost = (service.stackName ?? service.name).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const domain = (service as { domain?: string | null }).domain;
  const appUrl = domain?.trim()
    ? `http://${baseHost}.${domain.trim()}`
    : `http://${baseHost}.localhost`;
  const currentReplicas = service.replicas ?? 1;

  const [replicas, setReplicas] = useState(String(currentReplicas));
  const [replicasLoading, setReplicasLoading] = useState(false);
  const [replicasError, setReplicasError] = useState<string | null>(null);

  useEffect(() => {
    setReplicas(String(currentReplicas));
  }, [currentReplicas]);

  async function applyReplicas() {
    const num = parseInt(replicas, 10);
    if (num < 1 || num > 32) {
      setReplicasError("Replicas must be 1–32");
      return;
    }
    setReplicasError(null);
    setReplicasLoading(true);
    try {
      const patch = await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replicas: num }),
      });
      if (!patch.ok) {
        const data = await patch.json().catch(() => ({}));
        setReplicasError((data as { error?: string }).error ?? "Failed to save");
        return;
      }
      const scale = await fetch(`/api/services/${service.id}/scale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replicas: num }),
      });
      if (!scale.ok) {
        const data = await scale.json().catch(() => ({}));
        setReplicasError((data as { error?: string }).error ?? "Scale failed");
        return;
      }
      router.refresh();
    } catch {
      setReplicasError("Request failed");
    } finally {
      setReplicasLoading(false);
    }
  }

  useEffect(() => {
    const current = polledStatus ?? serverStatus;
    if (!BUSY_STATUSES.includes(current)) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/services/${service.id}/status`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { status?: string };
        const next = data.status ?? current;
        setPolledStatus(next);
        if (!BUSY_STATUSES.includes(next)) {
          router.refresh();
        }
      } catch {
        // keep polling on network error
      }
    }, DEPLOY_STATUS_POLL_MS);
    return () => clearInterval(interval);
  }, [service.id, serverStatus, polledStatus, router]);

  useEffect(() => {
    const current = polledStatus ?? serverStatus;
    if (BUSY_STATUSES.includes(current)) return;

    const fetchLive = async () => {
      try {
        const res = await fetch(`/api/services/${service.id}/status?live=1`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { status?: string };
        const next = data.status ?? current;
        setPolledStatus((prev) => (prev === next ? prev : next));
      } catch {
        // keep previous status on error
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, LIVE_STATUS_POLL_MS);
    return () => clearInterval(interval);
  }, [service.id, serverStatus, polledStatus, router]);

  return (
    <div className="w-full space-y-6">
      <div className="rounded-native border border-gl-edge bg-gl-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gl-edge p-6">
          <div>
            <Link
              href="/dashboard/apps"
              className="text-sm text-gl-text-muted transition hover:text-gl-text"
            >
              ← Back to Apps
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-gl-text">
                {service.name}
              </h1>
              <StatusPill status={status} />
            </div>
            <p className="mt-1 text-sm text-gl-text-muted">
              {service.repoUrl} ·{" "}
              <span className="text-gl-text-muted">{service.branch}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {(service as { deployMode?: string }).deployMode === "auto" && (
                <CheckForUpdatesButton
                  serviceId={service.id}
                  onTriggered={() => router.refresh()}
                />
              )}
              <span className="mx-1 h-6 w-px bg-gl-edge" aria-hidden />
              <span className="text-xs text-gl-text-muted">Replicas</span>
              <input
                type="number"
                min={1}
                max={32}
                value={replicas}
                onChange={(e) => {
                  setReplicas(e.target.value);
                  setReplicasError(null);
                }}
                className="w-14 rounded-lg border border-gl-edge bg-gl-input-bg px-2 py-1.5 text-center text-sm text-gl-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={applyReplicas}
                disabled={replicasLoading}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
              >
                {replicasLoading ? "Applying…" : "Scale"}
              </button>
              <DeployButton serviceId={service.id} currentStatus={status} compact />
            </div>
            {replicasError && (
              <p className="text-xs text-amber-400">{replicasError}</p>
            )}
            <span className="text-xs text-gl-text-muted">
              Deploy is run by the agent (queued then processed)
            </span>
          </div>
        </div>

        <nav
          className="flex gap-0 border-b border-gl-edge px-6"
          aria-label="App sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gl-text-muted hover:border-gl-edge hover:text-gl-text"
              }`}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={tab.icon}
                />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-native border border-gl-edge bg-gl-card shadow-sm overflow-hidden">
        {activeTab === "info" && (
          <InfoTab
            repoUrl={service.repoUrl}
            branch={service.branch}
            stackName={service.stackName ?? service.name}
            currentReplicas={currentReplicas}
            appUrl={appUrl}
          />
        )}

        {activeTab === "diagnostics" && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gl-text">Diagnostics</h2>
            <p className="mt-0.5 text-sm text-gl-text-muted">
              Check container reachability and Traefik routing. Run after deploy
              to verify the app is reachable.
            </p>
            <ServiceDiagnosticsBlock
              serviceId={service.id}
              expectedHost={domain?.trim() ? `${baseHost}.${domain.trim()}` : `${baseHost}.localhost`}
            />
          </div>
        )}

        {activeTab === "deployments" && (
          <DeploymentsTab
            serviceId={service.id}
            deployments={deployments}
            onDone={() => router.refresh()}
          />
        )}

        {activeTab === "logs" && <LogsTab serviceId={service.id} />}

        {activeTab === "settings" && (
          <SettingsPanel
            serviceId={service.id}
            appName={service.name}
            deployMode={
              (service as { deployMode?: string }).deployMode ?? "manual"
            }
            domain={(service as { domain?: string | null }).domain ?? null}
            entryCommand={(service as { entryCommand?: string | null }).entryCommand ?? null}
            buildCommand={(service as { buildCommand?: string | null }).buildCommand ?? null}
            onSaved={() => router.refresh()}
          />
        )}
      </div>
    </div>
  );
}
