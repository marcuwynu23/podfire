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
    const res = await gatewayFetch("/agents", { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ connected: 0, agents: [] });
    }
    const data = await res.json();
    return NextResponse.json({ connected: data.connected ?? 0, agents: data.agents ?? [] });
  } catch {
    return NextResponse.json({ connected: 0, agents: [] });
  }
}
