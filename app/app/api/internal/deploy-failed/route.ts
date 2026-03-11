import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAndDispatchDeployment } from "@/lib/deploy-dispatch";
import { gatewayFetch } from "@/lib/gateway-auth";

export const dynamic = "force-dynamic";

const MAX_AUTO_RETRIES = 3;

/**
 * Called by the agent gateway when a deployment fails. If retryCount < MAX_AUTO_RETRIES,
 * creates a new deployment and dispatches (automatic retry). Secured by Bearer token.
 */
export async function POST(request: Request) {
  const secret = process.env.DEPLOY_FAILED_CALLBACK_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  let body: { deploymentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const deploymentId = body.deploymentId;
  if (!deploymentId) {
    return NextResponse.json({ error: "deploymentId required" }, { status: 400 });
  }
  const deployment = await prisma.deployment.findFirst({
    where: { id: deploymentId },
    include: { service: { select: { userId: true } } },
  });
  if (!deployment) {
    return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
  }
  if (deployment.status !== "failed") {
    return NextResponse.json({ ok: true, message: "Not failed, skip retry" });
  }
  if (deployment.retryCount >= MAX_AUTO_RETRIES) {
    return NextResponse.json({ ok: true, message: "Max auto retries reached" });
  }
  try {
    const agentsRes = await gatewayFetch("/agents", { cache: "no-store" });
    const agentsData = await agentsRes.json();
    if ((agentsData.connected ?? 0) === 0) {
      return NextResponse.json({ ok: false, error: "No agent connected" }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Gateway unreachable" }, { status: 503 });
  }
  const result = await createAndDispatchDeployment(deployment.serviceId, deployment.service.userId, {
    retryCount: deployment.retryCount + 1,
    commitSha: deployment.commitSha,
    commitMessage: deployment.commitMessage,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    ok: true,
    newDeploymentId: result.deploymentId,
    retryCount: deployment.retryCount + 1,
  });
}
