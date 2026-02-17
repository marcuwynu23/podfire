import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

const GATEWAY_URL = process.env.AGENT_GATEWAY_URL ?? "http://localhost:3001";
const GATEWAY_SCALE_TIMEOUT_MS = 65000;

/**
 * POST scale: set replica count on the running Swarm service (docker service scale).
 * Also updates the service record so future deploys use this count.
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
    select: { id: true, stackName: true, name: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: { replicas?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const replicas = typeof body.replicas === "number"
    ? Math.min(32, Math.max(1, Math.floor(body.replicas)))
    : null;
  if (replicas == null) {
    return NextResponse.json({ error: "replicas (1-32) required" }, { status: 400 });
  }
  const stackName = service.stackName ?? service.name;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GATEWAY_SCALE_TIMEOUT_MS);
    const res = await fetch(`${GATEWAY_URL}/service-scale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stackName, replicas }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = (await res.json()) as { success?: boolean; output?: string; error?: string };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Scale failed" },
        { status: res.status }
      );
    }
    await prisma.service.update({
      where: { id: service.id },
      data: { replicas },
    });
    return NextResponse.json({ success: data.success === true, output: data.output ?? "", replicas });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Scale request timed out. The scale may still have been applied; check the agent."
        : "Agent gateway not reachable";
    return NextResponse.json(
      { error: message },
      { status: 503 }
    );
  }
}
