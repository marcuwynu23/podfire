import { NextResponse } from "next/server";
import { getSessionUserId, getDecryptedGitHubToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLatestCommitInfo } from "@/lib/github";
import { gatewayFetch } from "@/lib/gateway-auth";

/**
 * Check for new commits on the app branch and trigger deploy if deployMode is auto and there is a new commit.
 * Used for in-app "Check for updates" and optional polling so automatic watch works without external cron.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: serviceId } = await params;
  const service = await prisma.service.findFirst({
    where: { id: serviceId, userId },
  });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (service.deployMode !== "auto") {
    return NextResponse.json(
      { triggered: false, message: "App is not in auto-deploy mode." },
      { status: 200 }
    );
  }

  const token = await getDecryptedGitHubToken(service.userId);
  const commitInfo = await getLatestCommitInfo(service.repoUrl, service.branch, token);
  if (!commitInfo) {
    return NextResponse.json(
      { triggered: false, message: "Could not fetch latest commit (check repo access)." },
      { status: 200 }
    );
  }
  if (service.lastDeployedCommitSha === commitInfo.sha) {
    return NextResponse.json(
      { triggered: false, message: "No new commits." },
      { status: 200 }
    );
  }

  const inProgress = ["queued", "building", "pushing", "deploying"];
  const latest = await prisma.deployment.findFirst({
    where: { serviceId },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });
  if (latest && inProgress.includes(latest.status)) {
    return NextResponse.json(
      { triggered: false, message: "Deploy already in progress. Skipping to avoid stacking." },
      { status: 200 }
    );
  }

  let svc = service;
  if (svc.hostPort == null) {
    try {
      const portRes = await gatewayFetch("/agent/available-port", { cache: "no-store" });
      const portData = (await portRes.json()) as { port?: number; error?: string };
      if (portData.port != null && portData.port >= 1 && portData.port <= 65535) {
        svc = await prisma.service.update({
          where: { id: svc.id },
          data: { hostPort: portData.port },
        });
      }
    } catch {
      return NextResponse.json(
        { triggered: false, message: "Gateway not reachable." },
        { status: 503 }
      );
    }
  }

  const cloneUrl = svc.repoUrl.replace(
    "https://github.com/",
    token ? `https://x-access-token:${token}@github.com/` : "https://github.com/"
  );
  const port = svc.port ?? 80;
  let env: Record<string, string> | undefined;
  try {
    env = svc.env ? (JSON.parse(svc.env) as Record<string, string>) : undefined;
  } catch {
    env = undefined;
  }

  const deployment = await prisma.deployment.create({
    data: {
      serviceId: svc.id,
      status: "building",
      logs: "[check-updates] New commit detected, dispatching to agent.\n",
      commitSha: commitInfo.sha,
      commitMessage: commitInfo.message || undefined,
    },
  });

  const job = {
    deploymentId: deployment.id,
    serviceId: svc.id,
    repoUrl: svc.repoUrl,
    branch: svc.branch,
    cloneUrl,
    serviceName: svc.name,
    stackName: svc.stackName ?? svc.name,
    port,
    hostPort: svc.hostPort ?? null,
    replicas: svc.replicas ?? 1,
    entryCommand: svc.entryCommand ?? null,
    buildCommand: svc.buildCommand ?? null,
    outputDirectory: (svc as { outputDirectory?: string | null }).outputDirectory ?? null,
    env: env ?? null,
  };

  try {
    const dispatchRes = await gatewayFetch("/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    const dispatchData = (await dispatchRes.json()) as { ok?: boolean };
    if (dispatchRes.ok && dispatchData.ok) {
      return NextResponse.json({
        triggered: true,
        message: "Deploy triggered.",
        deploymentId: deployment.id,
      });
    }
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "failed", logs: "Check-updates: failed to dispatch to agent.\n" },
    });
    return NextResponse.json(
      { triggered: false, message: "Dispatch failed. Is an agent connected?" },
      { status: 503 }
    );
  } catch {
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "failed", logs: "Check-updates: gateway not reachable.\n" },
    });
    return NextResponse.json(
      { triggered: false, message: "Gateway not reachable." },
      { status: 503 }
    );
  }
}
