import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gatewayFetch } from "@/lib/gateway-auth";

export const dynamic = "force-dynamic";

const OFFLINE_THRESHOLD_MS = 90_000; // 90s without heartbeat = offline

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const keys = await prisma.agentRegistrationKey.findMany({
    where: { userId },
    select: { id: true, name: true, lastSeenAt: true },
    orderBy: { createdAt: "desc" },
  });
  let connectedList: { id: string; name: string; connectedAt: string; keyId?: string | null }[] = [];
  try {
    const res = await gatewayFetch("/agents", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      connectedList = data.agents ?? [];
    }
  } catch {
    // gateway down: all keys shown as offline
  }
  const connectedByKeyId = new Map(connectedList.filter((a) => a.keyId).map((a) => [a.keyId, a]));
  const now = Date.now();
  const agents = keys.map((key) => {
    const conn = key.id ? connectedByKeyId.get(key.id) : undefined;
    const name = key.name?.trim() || "Agent";
    if (conn) {
      return {
        keyId: key.id,
        agentId: conn.id,
        name,
        status: "online" as const,
        connectedAt: conn.connectedAt,
        lastSeenAt: key.lastSeenAt?.toISOString() ?? null,
      };
    }
    const lastSeenAt = key.lastSeenAt?.getTime() ?? null;
    const consideredOffline = lastSeenAt == null || now - lastSeenAt > OFFLINE_THRESHOLD_MS;
    return {
      keyId: key.id,
      agentId: null,
      name,
      status: (consideredOffline ? "offline" : "degraded") as "offline" | "degraded",
      connectedAt: null,
      lastSeenAt: key.lastSeenAt?.toISOString() ?? null,
    };
  });
  const connected = agents.filter((a) => a.status === "online").length;
  return NextResponse.json({ connected, agents });
}
