import { prisma } from "@/lib/db";
import { getDecryptedGitHubToken } from "@/lib/auth";
import { getLatestCommitInfo } from "@/lib/github";
import { gatewayFetch } from "@/lib/gateway-auth";

export type DeployDispatchResult =
  | { ok: true; deploymentId: string }
  | { ok: false; error: string; status: number };

/**
 * Build job payload for a service and optionally use commit info from a previous deployment.
 */
export async function buildDeployJob(serviceId: string, userId: string, options?: { commitSha?: string | null; commitMessage?: string | null }) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, userId },
  });
  if (!service) return null;
  const token = await getDecryptedGitHubToken(userId);
  const cloneUrl = service.repoUrl.replace(
    "https://github.com/",
    token ? `https://x-access-token:${token}@github.com/` : "https://github.com/"
  );
  let commitSha = options?.commitSha ?? null;
  let commitMessage = options?.commitMessage ?? null;
  if (!commitSha || !commitMessage) {
    try {
      const info = await getLatestCommitInfo(service.repoUrl, service.branch, token);
      if (info) {
        commitSha = info.sha;
        commitMessage = info.message || null;
      }
    } catch {
      // ignore
    }
  }
  const port = service.port ?? 80;
  let env: Record<string, string> | undefined;
  try {
    env = service.env ? (JSON.parse(service.env) as Record<string, string>) : undefined;
  } catch {
    env = undefined;
  }
  return {
    service,
    cloneUrl,
    commitSha,
    commitMessage,
    job: {
      serviceId: service.id,
      repoUrl: service.repoUrl,
      branch: service.branch,
      cloneUrl,
      serviceName: service.name,
      stackName: service.stackName ?? service.name,
      domain: service.domain ?? null,
      port,
      hostPort: service.hostPort ?? null,
      replicas: service.replicas ?? 1,
      cpuLimit: (service as { cpuLimit?: string | null }).cpuLimit ?? null,
      memoryLimit: (service as { memoryLimit?: string | null }).memoryLimit ?? null,
      entryCommand: service.entryCommand ?? null,
      buildCommand: service.buildCommand ?? null,
      env: env ?? null,
    },
  };
}

/**
 * Create a deployment record and dispatch to gateway. Does not check auth (caller must ensure).
 */
export async function createAndDispatchDeployment(
  serviceId: string,
  userId: string,
  extra: { retryCount?: number; commitSha?: string | null; commitMessage?: string | null }
): Promise<DeployDispatchResult> {
  const built = await buildDeployJob(serviceId, userId, {
    commitSha: extra.commitSha ?? undefined,
    commitMessage: extra.commitMessage ?? undefined,
  });
  if (!built) {
    return { ok: false, error: "Service not found", status: 404 };
  }
  const { service, job, commitSha, commitMessage } = built;
  const deployment = await prisma.deployment.create({
    data: {
      serviceId,
      status: "building",
      logs: "Dispatched to agent.\n",
      commitSha: commitSha ?? undefined,
      commitMessage: commitMessage ?? undefined,
      retryCount: extra.retryCount ?? 0,
    },
  });
  const payload = { ...job, deploymentId: deployment.id };
  try {
    const res = await gatewayFetch("/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok?: boolean };
    if (!res.ok || !data.ok) {
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "failed", logs: "Failed to send job to agent.\n" },
      });
      return { ok: false, error: "Dispatch failed", status: 503 };
    }
  } catch {
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "failed", logs: "Failed to reach agent gateway.\n" },
    });
    return { ok: false, error: "Gateway unreachable", status: 503 };
  }
  return { ok: true, deploymentId: deployment.id };
}
