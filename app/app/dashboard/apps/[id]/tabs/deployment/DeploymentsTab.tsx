"use client";

import {useState, useEffect} from "react";
import type {Deployment} from "@prisma/client";
import {LogsViewer} from "../../log/LogsViewer";
import {StatusPill} from "../props/StatusPill";

type DeploymentWithMeta = Deployment & {
  retryCount?: number;
  phaseDurations?: string | null;
  agentName?: string | null;
};

export function DeploymentsTab({
  serviceId,
  deployments,
  onDone,
}: {
  serviceId: string;
  deployments: DeploymentWithMeta[];
  onDone: () => void;
}) {
  const [rollbackIndex, setRollbackIndex] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<
    string | null
  >(deployments[0]?.id ?? null);
  const selectedDeployment =
    deployments.find((d) => d.id === selectedDeploymentId) ??
    deployments[0] ??
    null;

  useEffect(() => {
    if (
      deployments.length > 0 &&
      !deployments.some((d) => d.id === selectedDeploymentId)
    ) {
      setSelectedDeploymentId(deployments[0]?.id ?? null);
    }
  }, [deployments, selectedDeploymentId]);

  async function rollbackTo(steps: number) {
    setError(null);
    setRollbackIndex(steps);
    try {
      const res = await fetch(`/api/services/${serviceId}/rollback`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({steps}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as {error?: string}).error ?? "Rollback failed");
        return;
      }
      onDone();
    } catch {
      setError("Request failed");
    } finally {
      setRollbackIndex(null);
    }
  }

  async function retryDeployment(deploymentId: string) {
    setError(null);
    setRetryingId(deploymentId);
    try {
      const res = await fetch(`/api/deployments/${deploymentId}/retry`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as {error?: string}).error ?? "Retry failed");
        return;
      }
      onDone();
    } catch {
      setError("Request failed");
    } finally {
      setRetryingId(null);
    }
  }

  function formatPhaseDurations(
    phaseDurations: string | null | undefined,
  ): string | null {
    if (!phaseDurations) return null;
    try {
      const o = JSON.parse(phaseDurations) as Record<string, number>;
      const parts = ["clone", "build", "push", "deploy"]
        .filter((p) => typeof o[p] === "number" && o[p] > 0)
        .map((p) => `${p} ${o[p].toFixed(1)}s`);
      return parts.length > 0 ? parts.join(" · ") : null;
    } catch {
      return null;
    }
  }

  return (
    <div className="flex flex-col p-4 sm:p-6 lg:flex-row lg:gap-6">
      <section className="min-w-0 flex-1 lg:max-w-sm">
        <h2 className="text-base font-semibold text-gl-text">Deployments</h2>
        <p className="mt-0.5 text-sm text-gl-text-muted">
          Select a deployment to view its build logs. Rollback from the list.
        </p>
        {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
        {deployments.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-native-sm border border-dashed border-gl-edge py-12 text-center">
            <p className="text-sm text-gl-text-muted">No deployments yet.</p>
            <p className="mt-1 text-xs text-gl-text-muted">
              Use the Deploy button above to trigger your first deployment.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3" role="list">
            {deployments.map((d, index) => {
              const versionNum = index + 1;
              const isSelected = d.id === selectedDeploymentId;
              const commitSha = (d as {commitSha?: string | null}).commitSha;
              const commitMessage = (d as {commitMessage?: string | null})
                .commitMessage;
              const retryCount = d.retryCount ?? 0;
              const phaseSummary = formatPhaseDurations(d.phaseDurations);
              const dateStr = new Date(d.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              });
              const isFailed = d.status === "failed";
              return (
                <li
                  key={d.id}
                  className={`cursor-pointer rounded-lg border transition focus-within:ring-2 focus-within:ring-primary/30 ${
                    isSelected
                      ? "border-primary/50 bg-primary/10 shadow-sm"
                      : "border-gl-edge bg-gl-input-bg hover:border-gl-edge hover:bg-gl-hover"
                  }`}
                  onClick={() => setSelectedDeploymentId(d.id)}
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gl-text">
                          Deployment #{versionNum}
                        </span>
                        {index === 0 && (
                          <span className="inline-flex shrink-0 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Current
                          </span>
                        )}
                        {retryCount > 0 && (
                          <span
                            className="inline-flex shrink-0 rounded-md border border-gl-edge bg-gl-input-bg px-2 py-0.5 text-xs text-gl-text-muted"
                            title="Retry attempt"
                          >
                            Retry #{retryCount}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gl-text-muted">
                        <span
                          className="shrink-0"
                          title={new Date(d.createdAt).toISOString()}
                        >
                          {dateStr}
                        </span>
                        <span
                          className="hidden shrink-0 text-zinc-600 sm:inline"
                          aria-hidden
                        >
                          ·
                        </span>
                        <span className="shrink-0">
                          <StatusPill status={d.status} />
                        </span>
                        {d.agentName && (
                          <>
                            <span
                              className="hidden shrink-0 text-gl-text-muted sm:inline"
                              aria-hidden
                            >
                              ·
                            </span>
                            <span
                              className="shrink-0 truncate max-w-[10rem]"
                              title={`Agent: ${d.agentName}`}
                            >
                              {d.agentName}
                            </span>
                          </>
                        )}
                        {commitSha && (
                          <>
                            <span
                              className="hidden shrink-0 text-gl-text-muted sm:inline"
                              aria-hidden
                            >
                              ·
                            </span>
                            <span
                              className="inline-block max-w-[8ch] truncate font-mono text-gl-text-muted"
                              title={commitSha}
                            >
                              {commitSha.slice(0, 7)}
                            </span>
                          </>
                        )}
                      </div>
                      {phaseSummary && (
                        <p
                          className="text-xs text-gl-text-muted"
                          title="Phase durations"
                        >
                          {phaseSummary}
                        </p>
                      )}
                      {commitMessage && (
                        <p
                          className="line-clamp-2 text-xs text-gl-text-muted"
                          title={commitMessage}
                        >
                          {commitMessage}
                        </p>
                      )}
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-2 sm:pt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isFailed && (
                        <button
                          type="button"
                          onClick={() => retryDeployment(d.id)}
                          disabled={retryingId !== null}
                          className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                          title="Retry this deployment"
                        >
                          {retryingId === d.id ? "Retrying…" : "Retry"}
                        </button>
                      )}
                      {index === 0 ? (
                        <span className="text-xs text-gl-text-muted">
                          Active
                        </span>
                      ) : !isFailed ? (
                        <button
                          type="button"
                          onClick={() => rollbackTo(index)}
                          disabled={rollbackIndex !== null}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-50"
                          title={`Revert to this deployment (${index} rollback step${index > 1 ? "s" : ""})`}
                        >
                          {rollbackIndex === index
                            ? "Rolling back…"
                            : "Rollback"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6 min-w-0 flex-1 lg:mt-0">
        <h3 className="text-sm font-medium text-gl-text">Build logs</h3>
        <p className="mt-0.5 text-xs text-gl-text-muted">
          Build, push, and deploy output for the selected deployment.
        </p>
        {selectedDeployment ? (
          <div className="mt-3 rounded-native-sm border border-gl-edge bg-gl-input-bg p-3 sm:p-4">
            <LogsViewer
              deploymentId={selectedDeployment.id}
              initialLogs={
                (selectedDeployment as {logs?: string | null}).logs ?? null
              }
              embedded
            />
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-center rounded-native-sm border border-dashed border-gl-edge py-12 text-center">
            <p className="text-sm text-gl-text-muted">
              Select a deployment to view logs.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
