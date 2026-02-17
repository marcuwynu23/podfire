import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

const GATEWAY_URL = process.env.AGENT_GATEWAY_URL ?? "http://localhost:3001";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const res = await fetch(`${GATEWAY_URL}/traefik/status`, { cache: "no-store" });
    const text = await res.text();
    let data: { running?: boolean; error?: string } = {};
    try {
      if (text) data = JSON.parse(text);
    } catch {
      return NextResponse.json({
        running: false,
        error: "Start the agent gateway (npm run agent-gateway in the app folder), then start the agent.",
      });
    }
    return NextResponse.json({
      running: !!data.running,
      error: data.error ?? null,
    });
  } catch {
    return NextResponse.json({
      running: false,
      error: "Start the agent gateway (npm run agent-gateway in the app folder), then start the agent.",
    });
  }
}
