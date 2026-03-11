import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAndDispatchDeployment } from "@/lib/deploy-dispatch";
import { gatewayFetch } from "@/lib/gateway-auth";

export const dynamic = "force-dynamic";

const MAX_RETRIES = 5;

/**
 * Retry a failed deployment: creates a new deployment with retryCount+1 and dispatches.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: deploymentId } = await params;
  const deployment = await prisma.deployment.findFirst({
    where: { id: deploymentId },
    include: { service: { select: { userId: true } } },
  });
  if (!deployment || deployment.service.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (deployment.status !== "failed") {
    return NextResponse.json(
      { error: "Only failed deployments can be retried" },
      { status: 400 }
    );
  }
  const retryCount = (deployment as { retryCount?: number }).retryCount ?? 0;
  if (retryCount >= MAX_RETRIES) {
    return NextResponse.json(
      { error: `Max retries (${MAX_RETRIES}) exceeded` },
      { status: 400 }
    );
  }
  let agentsRes: Response;
  try {
    agentsRes = await gatewayFetch("/agents", { cache: "no-store" });
  } catch {
    return NextResponse.json(
      { error: "Agent gateway not reachable" },
      { status: 503 }
    );
  }
  const agentsData = await agentsRes.json();
  if ((agentsData.connected ?? 0) === 0) {
    return NextResponse.json(
      { error: "No agent connected" },
      { status: 503 }
    );
  }
  const result = await createAndDispatchDeployment(deployment.serviceId, userId, {
    retryCount: retryCount + 1,
    commitSha: deployment.commitSha,
    commitMessage: deployment.commitMessage,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }
  return NextResponse.json({
    deploymentId: result.deploymentId,
    status: "building",
    retryCount: retryCount + 1,
  });
}
