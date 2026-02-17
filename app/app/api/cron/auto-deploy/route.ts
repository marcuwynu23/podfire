import { NextResponse } from "next/server";
import { getDecryptedGitHubToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLatestCommitSha } from "@/lib/github";

const GATEWAY_URL = process.env.AGENT_GATEWAY_URL ?? "http://localhost:3001";
const CRON_SECRET = process.env.CRON_SECRET ?? process.env.AUTO_DEPLOY_CRON_SECRET;

/**
 * Cron endpoint: check apps with deployMode=auto and trigger deploy when branch has new commits.
 * Call periodically (e.g. every 5 min) with Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const u = new URL(request.url || "/", "http://localhost");
  const tokenFromQuery = u.searchParams.get("secret");
  const secret = tokenFromHeader ?? tokenFromQuery;
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const autoServices = await prisma.service.findMany({
    where: { deployMode: "auto" },
    orderBy: { createdAt: "asc" },
  });
  const triggered: string[] = [];
  const skipped: string[] = [];

  for (const service of autoServices) {
    const token = await getDecryptedGitHubToken(service.userId);
    const latestSha = await getLatestCommitSha(service.repoUrl, service.branch, token);
    if (!latestSha) {
      skipped.push(service.name + " (could not get commit)");
      continue;
    }
    if (service.lastDeployedCommitSha === latestSha) {
      skipped.push(service.name + " (no new commits)");
      continue;
    }

    let svc = service;
    if (svc.hostPort == null) {
      try {
        const portRes = await fetch(`${GATEWAY_URL}/agent/available-port`, { cache: "no-store" });
        const portData = (await portRes.json()) as { port?: number; error?: string };
        if (portData.port != null && portData.port >= 1 && portData.port <= 65535) {
          svc = await prisma.service.update({
            where: { id: svc.id },
            data: { hostPort: portData.port },
          });
        }
      } catch {
        // skip this service if we can't get port
        skipped.push(service.name + " (no agent for port)");
        continue;
      }
    }

    const cloneUrl = svc.repoUrl.replace(
      "https://github.com/",
      token ? `https://x-access-token:${token}@github.com/` : "https://github.com/"
    );
    const port = svc.port ?? (svc.framework === "custom" ? 80 : 3000);
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
        logs: "[auto-deploy] New commit detected, dispatching to agent.\n",
        commitSha: latestSha,
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
      env: env ?? null,
    };

    try {
      const dispatchRes = await fetch(`${GATEWAY_URL}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      const dispatchData = (await dispatchRes.json()) as { ok?: boolean };
      if (dispatchRes.ok && dispatchData.ok) {
        triggered.push(svc.name);
      } else {
        await prisma.deployment.update({
          where: { id: deployment.id },
          data: { status: "failed", logs: "Auto-deploy: failed to dispatch to agent.\n" },
        });
        skipped.push(svc.name + " (dispatch failed)");
      }
    } catch {
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "failed", logs: "Auto-deploy: gateway not reachable.\n" },
      });
      skipped.push(svc.name + " (gateway error)");
    }
  }

  return NextResponse.json({
    ok: true,
    triggered,
    skipped,
    message:
      triggered.length > 0
        ? `Triggered: ${triggered.join(", ")}`
        : skipped.length === 0
          ? "No auto-deploy apps."
          : "No new commits.",
  });
}
