"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { Deployment, Service } from "@prisma/client";
import { useRouter } from "next/navigation";
import { DeployButton } from "./DeployButton";
import { CheckForUpdatesButton } from "./CheckForUpdatesButton";
import { LogsViewer } from "./LogsViewer";
import { AppLogsViewer } from "./AppLogsViewer";
import { DeleteAppButton } from "./DeleteAppButton";

const tabs = [
  { id: "info", label: "Information", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "deployments", label: "Deployments", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
  { id: "logs", label: "Logs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "diagnostics", label: "Diagnostics", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function StatusPill({ status }: { status: string }) {
  const s = status === "—" ? "idle" : status;
  const styles: Record<string, string> = {
    running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
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
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${style}`}
    >
      {s === "idle" ? "No deployment" : s}
    </span>
  );
}

type ServiceWithDeployments = Service & { deployments: Deployment[]; replicas?: number };

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
  const status = latestDeployment?.status ?? "—";
  const appUrl = `http://${service.stackName ?? service.name}.localhost`;
  const currentReplicas = service.replicas ?? 1;

  return (
    <div className="w-full space-y-6">
      {/* Header card */}
      <div className="rounded-native border border-white/[0.06] bg-gl-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] p-6">
          <div>
            <Link
              href="/dashboard/apps"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              ← Back to Apps
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {service.name}
              </h1>
              <StatusPill status={status} />
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {service.repoUrl} · <span className="text-zinc-500">{service.branch}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <DeployButton serviceId={service.id} currentStatus={status} />
              {(service as { deployMode?: string }).deployMode === "auto" && (
                <CheckForUpdatesButton serviceId={service.id} onTriggered={() => router.refresh()} />
              )}
            </div>
            <span className="text-xs text-zinc-500">
              Deploy is run by the agent (queued then processed)
            </span>
          </div>
        </div>

        {/* Tabs */}
        <nav
          className="flex gap-0 border-b border-white/[0.06] px-6"
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
                  : "border-transparent text-zinc-400 hover:border-white/10 hover:text-zinc-300"
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

      {/* Tab panels */}
      <div className="rounded-native border border-white/[0.06] bg-gl-card shadow-sm overflow-hidden">
        {activeTab === "info" && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-white">Information</h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              Repository and runtime details for this app.
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Repository
                </dt>
                <dd className="mt-1 font-mono text-sm text-zinc-300 break-all">
                  {service.repoUrl}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Branch
                </dt>
                <dd className="mt-1 font-mono text-sm text-zinc-300">
                  {service.branch}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Stack name
                </dt>
                <dd className="mt-1 font-mono text-sm text-zinc-300">
                  {service.stackName ?? service.name}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  App URL
                </dt>
                <dd className="mt-1">
                  <a
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-primary hover:underline"
                  >
                    {appUrl}
                  </a>
                </dd>
              </div>
            </dl>

            {status === "running" && <AppUrlPreview appUrl={appUrl} />}
          </div>
        )}

        {activeTab === "diagnostics" && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-white">Diagnostics</h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              Check container reachability and Traefik routing. Run after deploy to verify the app is reachable.
            </p>
            <ServiceDiagnosticsBlock serviceId={service.id} />
          </div>
        )}

        {activeTab === "deployments" && (
          <DeploymentsTab
            serviceId={service.id}
            currentReplicas={currentReplicas}
            deployments={deployments}
            onDone={() => router.refresh()}
          />
        )}

        {activeTab === "logs" && (
          <LogsTab serviceId={service.id} deployments={deployments} />
        )}

        {activeTab === "settings" && (
          <SettingsPanel
            serviceId={service.id}
            appName={service.name}
            deployMode={(service as { deployMode?: string }).deployMode ?? "manual"}
            onSaved={() => router.refresh()}
          />
        )}
      </div>
    </div>
  );
}

function DeployModeBlock({
  serviceId,
  deployMode,
  onSaved,
}: {
  serviceId: string;
  deployMode: string;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState(deployMode === "auto" ? "auto" : "manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(deployMode === "auto" ? "auto" : "manual");
  }, [deployMode]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deployMode: mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to save");
        return;
      }
      onSaved();
    } catch {
      setError("Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-native border border-white/[0.06] bg-black/10 p-4">
      <h3 className="text-sm font-medium text-white">Deploy mode</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Manual: deploy only when you click Deploy. Auto: watch the app branch and deploy when there are new commits (call the auto-deploy cron periodically).
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "manual" | "auto")}
          className="rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="manual">Manual</option>
          <option value="auto">Auto (watch branch)</option>
        </select>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
    </section>
  );
}

function AppUrlPreview({ appUrl }: { appUrl: string }) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-medium text-white">Preview</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Rendered preview of the app. Open in new tab if the frame does not load (e.g. *.localhost).
      </p>
      <div className="mt-3 overflow-hidden rounded-native border border-white/[0.08] bg-black/30 shadow-sm">
        <iframe
          src={appUrl}
          title="App preview"
          className="h-[360px] w-full border-0"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        />
      </div>
    </section>
  );
}

const logSubTabs = [
  { id: "deployment", label: "Deployment Logs" },
  { id: "application", label: "Application Logs" },
] as const;

type LogSubTabId = (typeof logSubTabs)[number]["id"];

function LogsTab({ serviceId, deployments }: { serviceId: string; deployments: Deployment[] }) {
  const [subTab, setSubTab] = useState<LogSubTabId>("deployment");
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(
    deployments[0]?.id ?? null
  );
  const selectedDeployment = deployments.find((d) => d.id === selectedDeploymentId) ?? deployments[0] ?? null;

  useEffect(() => {
    const firstId = deployments[0]?.id ?? null;
    if (!deployments.some((d) => d.id === selectedDeploymentId)) {
      setSelectedDeploymentId(firstId);
    }
  }, [deployments, selectedDeploymentId]);

  return (
    <div className="p-6">
      <h2 className="text-base font-semibold text-white">Logs</h2>
      <p className="mt-0.5 text-sm text-zinc-400">
        Build/deploy logs per deployment, or runtime logs from the running container.
      </p>

      <nav className="mt-4 flex gap-0 border-b border-white/[0.06]" aria-label="Log type">
        {logSubTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              subTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {subTab === "deployment" && (
        <div className="mt-4">
          {deployments.length === 0 ? (
            <p className="text-sm text-zinc-500">No deployments yet. Deploy to see build logs.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="text-sm font-medium text-zinc-400">Deployment</label>
                <select
                  value={selectedDeploymentId ?? ""}
                  onChange={(e) => setSelectedDeploymentId(e.target.value || null)}
                  className="rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {deployments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {new Date(d.createdAt).toLocaleString()} — {d.status}
                    </option>
                  ))}
                </select>
              </div>
              {selectedDeployment && (
                <div className="rounded-native-sm border border-white/[0.06] bg-black/10 p-4">
                  <p className="mb-2 text-xs text-zinc-500">
                    Build, push, and deploy output for this deployment.
                  </p>
                  <LogsViewer
                    deploymentId={selectedDeployment.id}
                    initialLogs={selectedDeployment.logs}
                    embedded
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {subTab === "application" && (
        <div className="mt-4 rounded-native-sm border border-white/[0.06] bg-black/10 p-4">
          <p className="mb-2 text-xs text-zinc-500">
            Live stdout/stderr from the running container.
          </p>
          <AppLogsViewer serviceId={serviceId} live />
        </div>
      )}
    </div>
  );
}

type DiagnosticsResult = {
  stackName: string;
  serviceName: string;
  expectedPort: number;
  expectedHost: string;
  serviceExists: boolean;
  serviceTasksSummary: string;
  serviceInspectSnippet: string;
  containerReachable: boolean;
  containerHttpStatus: number | null;
  containerCurlError: string | null;
  traefikLogs: string;
  traefikMentionsService: boolean;
  verdict: string;
  summary: string;
};

function ServiceDiagnosticsBlock({ serviceId }: { serviceId: string }) {
  const [result, setResult] = useState<DiagnosticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  async function runDiagnostics() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/diagnostics`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to run diagnostics");
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
        Inspect the deployed service: container reachability (curl) and Traefik routing. Run after deploy to verify.
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
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Verdict</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${verdictColor}`}>
              {result.verdict.replace(/_/g, " ")}
            </span>
            {result.containerHttpStatus != null && (
              <span className="text-xs text-zinc-500">HTTP {result.containerHttpStatus}</span>
            )}
          </div>
          <p className="text-sm text-zinc-300">{result.summary}</p>
          <div>
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {detailsOpen ? "Hide" : "Show"} details (service tasks, Traefik logs)
            </button>
            {detailsOpen && (
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Service tasks</p>
                  <pre className="mt-1 max-h-32 overflow-auto rounded border border-white/[0.06] bg-black/20 p-2 font-mono text-xs text-zinc-400 whitespace-pre-wrap">
                    {result.serviceTasksSummary || "(none)"}
                  </pre>
                </div>
                {result.containerCurlError && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Curl error</p>
                    <pre className="mt-1 max-h-20 overflow-auto rounded border border-white/[0.06] bg-black/20 p-2 font-mono text-xs text-amber-300/90 whitespace-pre-wrap">
                      {result.containerCurlError}
                    </pre>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-zinc-500">Traefik logs (tail)</p>
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

function DeploymentsTab({
  serviceId,
  currentReplicas,
  deployments,
  onDone,
}: {
  serviceId: string;
  currentReplicas: number;
  deployments: Deployment[];
  onDone: () => void;
}) {
  const [replicas, setReplicas] = useState(String(currentReplicas));
  const [saving, setSaving] = useState(false);
  const [scaling, setScaling] = useState(false);
  const [rollbackIndex, setRollbackIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReplicas(String(currentReplicas));
  }, [currentReplicas]);

  async function scaleNow() {
    const num = parseInt(replicas, 10);
    if (num < 1 || num > 32) {
      setError("Replicas must be between 1 and 32");
      return;
    }
    setError(null);
    setScaling(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/scale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replicas: num }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Scale failed");
        return;
      }
      onDone();
    } catch {
      setError("Request failed");
    } finally {
      setScaling(false);
    }
  }

  async function saveReplicas() {
    const num = parseInt(replicas, 10);
    if (num < 1 || num > 32) {
      setError("Replicas must be between 1 and 32");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replicas: num }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to save");
        return;
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  async function rollbackTo(steps: number) {
    setError(null);
    setRollbackIndex(steps);
    try {
      const res = await fetch(`/api/services/${serviceId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Rollback failed");
        return;
      }
      onDone();
    } catch {
      setError("Request failed");
    } finally {
      setRollbackIndex(null);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-base font-semibold text-white">Deployments</h2>
      <p className="mt-0.5 text-sm text-zinc-400">
        Scale replicas, rollback to a previous deployment, and view history.
      </p>

      {/* Replicas */}
      <section className="mt-6 rounded-native border border-white/[0.06] p-4">
        <h3 className="text-sm font-medium text-white">Replicas</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Number of container replicas (1–32). Save for next deploy; Scale now applies to the running service immediately.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            max={32}
            value={replicas}
            onChange={(e) => { setReplicas(e.target.value); setError(null); }}
            className="w-20 rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={saveReplicas}
            disabled={saving || scaling}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={scaleNow}
            disabled={saving || scaling}
            className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2 text-sm font-medium text-zinc-300 shadow-sm transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            {scaling ? "Scaling…" : "Scale now"}
          </button>
        </div>
      </section>

      {/* Deployment history + per-deployment rollback */}
      <section className="mt-6">
        <h3 className="text-sm font-medium text-white">Deployment history</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Newest first. Rollback to a previous deployment (Docker Swarm reverts the service that many steps).
        </p>
        {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
        {deployments.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-native-sm border border-dashed border-white/10 py-12 text-center">
            <p className="text-sm text-zinc-500">No deployments yet.</p>
            <p className="mt-1 text-xs text-zinc-600">Use the Deploy button above to trigger your first deployment.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {deployments.map((d, index) => {
              const versionNum = index + 1;
              return (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-native-sm border border-white/[0.06] bg-black/20 px-4 py-3 transition hover:border-white/[0.08]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Deployment #{versionNum}
                  </span>
                  {index === 0 && (
                    <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      Current
                    </span>
                  )}
                  <span className="text-sm text-zinc-500">
                    {new Date(d.createdAt).toLocaleString()}
                  </span>
                  <StatusPill status={d.status} />
                  {(d as { commitSha?: string | null }).commitSha && (
                    <span className="font-mono text-xs text-zinc-500" title={(d as { commitSha?: string }).commitSha}>
                      {(d as { commitSha: string }).commitSha.slice(0, 7)}
                    </span>
                  )}
                  {(d as { commitMessage?: string | null }).commitMessage && (
                    <span className="max-w-[200px] truncate text-xs text-zinc-500" title={(d as { commitMessage: string }).commitMessage}>
                      {(d as { commitMessage: string }).commitMessage}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {index === 0 ? (
                    <span className="text-xs text-zinc-500">—</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => rollbackTo(index)}
                      disabled={rollbackIndex !== null}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                      title={`Revert service to this deployment (${index} rollback step${index > 1 ? "s" : ""})`}
                    >
                      {rollbackIndex === index ? "Rolling back…" : "Rollback to this"}
                    </button>
                  )}
                </div>
              </li>
            );})}
          </ul>
        )}
      </section>
    </div>
  );
}

function SettingsPanel({
  serviceId,
  appName,
  deployMode,
  onSaved,
}: {
  serviceId: string;
  appName: string;
  deployMode: string;
  onSaved: () => void;
}) {
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold text-white">Settings</h2>
      <p className="mt-0.5 text-sm text-zinc-400">
        Deploy mode and danger zone.
      </p>

      <DeployModeBlock
        serviceId={serviceId}
        deployMode={deployMode}
        onSaved={onSaved}
      />

      <section className="mt-6 rounded-native border border-red-500/20 bg-red-500/5">
        <div className="border-b border-red-500/20 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Danger zone</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Permanently remove this app and its deployments. This cannot be undone.
          </p>
        </div>
        <div className="p-4">
          <DeleteAppButton serviceId={serviceId} appName={appName} />
        </div>
      </section>
    </div>
  );
}
