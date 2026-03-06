import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gatewayFetch } from "@/lib/gateway-auth";

/**
 * POST rollback: revert the running Swarm service to a previous deployment (docker service rollback, optionally multiple steps).
 * Body: { steps?: number } — number of rollback steps (1–10, default 1).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const service = await prisma.service.findFirst({
    where: { id, userId },
    select: { stackName: true, name: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: { steps?: number } = {};
  try {
    body = await request.json();
  } catch {
    // no body is ok, use steps 1
  }
  const steps = typeof body.steps === "number" ? Math.min(10, Math.max(1, Math.floor(body.steps))) : 1;
  const stackName = service.stackName ?? service.name;
  try {
    const res = await gatewayFetch("/service-rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stackName, steps }),
    });
    const data = (await res.json()) as { success?: boolean; output?: string; error?: string };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Rollback failed" },
        { status: res.status }
      );
    }
    return NextResponse.json({ success: data.success === true, output: data.output ?? "" });
  } catch {
    return NextResponse.json(
      { error: "Agent gateway not reachable" },
      { status: 503 }
    );
  }
}
