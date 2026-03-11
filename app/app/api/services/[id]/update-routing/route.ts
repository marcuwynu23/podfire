import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gatewayFetch } from "@/lib/gateway-auth";

export const dynamic = "force-dynamic";

/**
 * Update Traefik routing for this service: redeploy the stack with current domain
 * so that Host(<name>.<domain>) is used instead of Host(<name>.localhost).
 * Fixes 404 when a custom domain was set after the last deploy.
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
    select: {
      id: true,
      name: true,
      stackName: true,
      port: true,
      domain: true,
      replicas: true,
      env: true,
    },
  });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let env: Record<string, string> | undefined;
  try {
    env = service.env ? (JSON.parse(service.env) as Record<string, string>) : undefined;
  } catch {
    env = undefined;
  }
  const stackName = service.stackName ?? service.name;
  const domain = (service as { domain?: string | null }).domain ?? null;
  const payload = {
    stackName,
    serviceName: service.name,
    port: service.port ?? 80,
    domain,
    replicas: service.replicas ?? 1,
    env: env ?? null,
  };
  try {
    const res = await gatewayFetch("/update-stack-labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Update failed" },
        { status: res.status }
      );
    }
    if (!data.ok) {
      return NextResponse.json(
        { error: data.error ?? "No agent connected. Start the agent first." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, message: "Routing updated. Requests to your custom domain should work now." });
  } catch {
    return NextResponse.json(
      { error: "Agent gateway not reachable. Start the gateway and agent." },
      { status: 503 }
    );
  }
}
