import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gatewayFetch } from "@/lib/gateway-auth";

/**
 * GET latest deployment status for a service (for polling during deploy).
 * With ?live=1, also checks the agent: if the Swarm service is actually running.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const live = searchParams.get("live") === "1" || searchParams.get("live") === "true";

  const [latest, service] = await Promise.all([
    prisma.deployment.findFirst({
      where: { service: { id, userId } },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    }),
    live
      ? prisma.service.findFirst({
          where: { id, userId },
          select: { stackName: true, name: true },
        })
      : null,
  ]);

  const dbStatus = latest?.status ?? "—";

  if (!live || !service) {
    return NextResponse.json({ status: dbStatus });
  }

  const stackName = service.stackName ?? service.name;
  try {
    const res = await gatewayFetch(
      `/service-status?stackName=${encodeURIComponent(stackName)}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as { running?: boolean; error?: string };
    const actuallyRunning = !!data.running;

    if (actuallyRunning) {
      return NextResponse.json({ status: "running" });
    }
    if (dbStatus === "running") {
      return NextResponse.json({ status: "stopped" });
    }
  } catch {
    // Gateway unreachable: keep DB status
  }
  return NextResponse.json({ status: dbStatus });
}
