import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

const GATEWAY_URL = process.env.AGENT_GATEWAY_URL ?? "http://localhost:3001";

/**
 * GET service diagnostics: container reachability and Traefik routing.
 * Runs on the agent: inspects Swarm service, curls container port, checks Traefik logs.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const service = await prisma.service.findFirst({
    where: { id, userId },
    select: { stackName: true, name: true, port: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stackName = service.stackName ?? service.name;
  const port = service.port ?? 80;
  try {
    const res = await fetch(
      `${GATEWAY_URL}/service-diagnostics?stackName=${encodeURIComponent(stackName)}&port=${port}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as { diagnostics?: unknown; error?: string };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Failed to run diagnostics", diagnostics: null },
        { status: res.status }
      );
    }
    if (data.error) {
      return NextResponse.json(
        { error: data.error, diagnostics: null },
        { status: 502 }
      );
    }
    return NextResponse.json({ diagnostics: data.diagnostics });
  } catch {
    return NextResponse.json(
      { error: "Agent gateway not reachable", diagnostics: null },
      { status: 503 }
    );
  }
}
