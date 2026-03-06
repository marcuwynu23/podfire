import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { gatewayFetch } from "@/lib/gateway-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const agentId = typeof body?.agentId === "string" ? body.agentId.trim() : "";
    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }
    const res = await gatewayFetch("/agent/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Failed to disconnect agent" },
        { status: res.status === 404 ? 404 : 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disconnect agent" },
      { status: 500 }
    );
  }
}
