import { NextResponse } from "next/server";
import { getSessionUserId, getDecryptedGitHubToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLatestCommitInfo } from "@/lib/github";
import { gatewayFetch } from "@/lib/gateway-auth";

/**
 * Start a deployment. Requires the agent gateway running with at least one connected agent.
 */
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let agentsRes: Response;
  try {
    agentsRes = await gatewayFetch("/agents", { cache: "no-store" });
  } catch {
    return NextResponse.json(
      { error: "Agent gateway not reachable. Start it with: npm run agent-gateway" },
      { status: 503 }
    );
  }
  if (!agentsRes.ok) {
    return NextResponse.json(
      { error: "Agent gateway error." },
      { status: 503 }
    );
  }
  const agentsData = await agentsRes.json();
  if ((agentsData.connected ?? 0) === 0) {
    return NextResponse.json(
      { error: "No agent connected. Start the agent and register it first (see Dashboard)." },
      { status: 503 }
    );
  }

  let body: { serviceId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { serviceId } = body;
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId required" }, { status: 400 });
  }
  let service = await prisma.service.findFirst({
    where: { id: serviceId, userId },
  });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Auto-assign host port on first deploy if not set (avoids conflicts with running ports)
  if (service.hostPort == null) {
    try {
      const portRes = await gatewayFetch("/agent/available-port", { cache: "no-store" });
      const portData = (await portRes.json()) as { port?: number; error?: string };
      if (portData.port != null && portData.port >= 1 && portData.port <= 65535) {
        service = await prisma.service.update({
          where: { id: service.id },
          data: { hostPort: portData.port },
        });
      }
    } catch {
      // continue without host port if gateway/agent unavailable
    }
  }

  const token = await getDecryptedGitHubToken(userId);
  const cloneUrl = service.repoUrl.replace(
    "https://github.com/",
    token ? `https://x-access-token:${token}@github.com/` : "https://github.com/"
  );

  // Resolve current commit SHA and message for this branch
  let commitSha: string | null = null;
  let commitMessage: string | null = null;
  try {
    const info = await getLatestCommitInfo(service.repoUrl, service.branch, token);
    if (info) {
      commitSha = info.sha;
      commitMessage = info.message || null;
    }
  } catch {
    // ignore
  }

  const deployment = await prisma.deployment.create({
    data: {
      serviceId,
      status: "building",
      logs: "Dispatched to agent.\n",
      commitSha: commitSha ?? undefined,
      commitMessage: commitMessage ?? undefined,
    },
  });

  const port = service.port ?? 80;
  let env: Record<string, string> | undefined;
  try {
    env = service.env ? (JSON.parse(service.env) as Record<string, string>) : undefined;
  } catch {
    env = undefined;
  }
  const domain = (service as { domain?: string | null }).domain ?? null;
  const job = {
    deploymentId: deployment.id,
    serviceId: service.id,
    repoUrl: service.repoUrl,
    branch: service.branch,
    cloneUrl,
    serviceName: service.name,
    stackName: service.stackName ?? service.name,
    domain,
    port,
    hostPort: service.hostPort ?? null,
    replicas: service.replicas ?? 1,
    cpuLimit: (service as { cpuLimit?: string | null }).cpuLimit ?? null,
    memoryLimit: (service as { memoryLimit?: string | null }).memoryLimit ?? null,
    entryCommand: service.entryCommand ?? null,
    buildCommand: service.buildCommand ?? null,
    outputDirectory: (service as { outputDirectory?: string | null }).outputDirectory ?? null,
    env: env ?? null,
  };

  try {
    const dispatchRes = await gatewayFetch("/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    const dispatchData = (await dispatchRes.json()) as { ok?: boolean };
    if (!dispatchRes.ok || !dispatchData.ok) {
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "failed", logs: "Failed to send job to agent.\n" },
      });
      return NextResponse.json(
        { error: "Dispatch failed. Agent may have disconnected." },
        { status: 503 }
      );
    }
  } catch {
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "failed", logs: "Failed to reach agent gateway.\n" },
    });
    return NextResponse.json(
      { error: "Failed to reach agent gateway." },
      { status: 503 }
    );
  }

  return NextResponse.json({ deploymentId: deployment.id, status: "building" });
}
