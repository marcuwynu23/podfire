"use client";

import Link from "next/link";
import {useState, useEffect, useRef} from "react";
import {useRouter} from "next/navigation";
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
} from "./tabs/props";
import {DeployButton} from "./components/DeployButton";
import {CheckForUpdatesButton} from "./components/CheckForUpdatesButton";

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
  const baseHost = (service.stackName ?? service.name)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const domain = (service as {domain?: string | null}).domain;
  const diagnosticsEnabled =
    (service as {diagnosticsEnabled?: boolean}).diagnosticsEnabled ?? false;
  const visibleTabs = tabs.filter(
    (tab) => tab.id !== "diagnostics" || diagnosticsEnabled,
  );
  const primaryTabs = visibleTabs.slice(0, 4);
  const overflowTabs = visibleTabs.slice(4);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "diagnostics" && !diagnosticsEnabled) {
      setActiveTab("info");
    }
  }, [activeTab, diagnosticsEnabled]);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [moreOpen]);
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
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({replicas: num}),
      });
      if (!patch.ok) {
        const data = await patch.json().catch(() => ({}));
        setReplicasError((data as {error?: string}).error ?? "Failed to save");
        return;
      }
      const scale = await fetch(`/api/services/${service.id}/scale`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({replicas: num}),
      });
      if (!scale.ok) {
        const data = await scale.json().catch(() => ({}));
        setReplicasError((data as {error?: string}).error ?? "Scale failed");
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
        const data = (await res.json()) as {status?: string};
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
        const data = (await res.json()) as {status?: string};
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
    <div className="min-w-0 w-full space-y-4 sm:space-y-6">
      <div className="rounded-native border border-gl-edge bg-gl-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gl-edge p-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0 flex-1">
            <Link
              href="/dashboard/apps"
              className="text-sm text-gl-text-muted transition hover:text-gl-text"
            >
              ← Back to Apps
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-gl-text sm:text-2xl">
                {service.name}
              </h1>
              <StatusPill status={status} />
            </div>
            <p className="mt-1 truncate text-sm text-gl-text-muted">
              {service.repoUrl} ·{" "}
              <span className="text-gl-text-muted">{service.branch}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
              {(service as {deployMode?: string}).deployMode === "auto" && (
                <CheckForUpdatesButton
                  serviceId={service.id}
                  onTriggered={() => router.refresh()}
                />
              )}
              <span className="mx-1 hidden h-6 w-px bg-gl-edge sm:inline" aria-hidden />
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
              <DeployButton
                serviceId={service.id}
                currentStatus={status}
                compact
              />
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
          className="flex border-b border-gl-edge px-2 sm:gap-0 sm:overflow-x-auto sm:px-6 sm:scrollbar-thin"
          aria-label="App sections"
        >
          {/* Mobile: 4 icon-only tabs + More (equal width) */}
          <div className="flex w-full min-w-0 sm:hidden">
            {primaryTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-b-2 py-3 transition ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gl-text-muted hover:border-gl-edge hover:text-gl-text"
                }`}
                title={tab.label}
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={tab.icon}
                  />
                </svg>
                <span className="sr-only">{tab.label}</span>
              </button>
            ))}
            {overflowTabs.length > 0 && (
              <div className="relative flex min-w-0 flex-1 basis-0" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-b-2 py-3 transition ${
                    overflowTabs.some((t) => t.id === activeTab)
                      ? "border-primary text-primary"
                      : "border-transparent text-gl-text-muted hover:border-gl-edge hover:text-gl-text"
                  }`}
                  title="More tabs"
                  aria-expanded={moreOpen}
                  aria-haspopup="true"
                >
                  <svg
                    className="h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                  <span className="sr-only">More</span>
                </button>
                {moreOpen && (
                  <div className="absolute right-0 top-full z-20 mt-0.5 min-w-[10rem] rounded-lg border border-gl-edge bg-gl-card py-1 shadow-lg">
                    {overflowTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMoreOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-gl-hover ${
                          activeTab === tab.id
                            ? "bg-primary/10 text-primary"
                            : "text-gl-text"
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
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Desktop: all tabs with icon + label */}
          <div className="hidden sm:flex sm:gap-0">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition ${
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
          </div>
        </nav>
      </div>

      <div className="min-w-0 overflow-hidden rounded-native border border-gl-edge bg-gl-card shadow-sm">
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
          <div className="p-4 sm:p-6">
            <h2 className="text-base font-semibold text-gl-text">
              Diagnostics
            </h2>
            <p className="mt-0.5 text-sm text-gl-text-muted">
              Check container reachability and Traefik routing. Run after deploy
              to verify the app is reachable.
            </p>
            <ServiceDiagnosticsBlock
              serviceId={service.id}
              expectedHost={
                domain?.trim()
                  ? `${baseHost}.${domain.trim()}`
                  : `${baseHost}.localhost`
              }
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
              (service as {deployMode?: string}).deployMode ?? "manual"
            }
            domain={(service as {domain?: string | null}).domain ?? null}
            diagnosticsEnabled={diagnosticsEnabled}
            entryCommand={
              (service as {entryCommand?: string | null}).entryCommand ?? null
            }
            buildCommand={
              (service as {buildCommand?: string | null}).buildCommand ?? null
            }
            outputDirectory={
              (service as {outputDirectory?: string | null}).outputDirectory ?? null
            }
            onSaved={() => router.refresh()}
          />
        )}
      </div>
    </div>
  );
}
