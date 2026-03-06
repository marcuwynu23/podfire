import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { gatewayFetch } from "@/lib/gateway-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const res = await gatewayFetch("/agent/available-port", { cache: "no-store" });
    const data = (await res.json()) as { port?: number; error?: string };
    return NextResponse.json({ port: data.port ?? null, error: data.error ?? null });
  } catch {
    return NextResponse.json({ port: null, error: "Gateway not reachable" });
  }
}
