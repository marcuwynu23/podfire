import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

const GATEWAY_URL = process.env.AGENT_GATEWAY_URL ?? "http://localhost:3001";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/traefik/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Remove failed" },
        { status: res.status }
      );
    }
    if (!data.ok) {
      return NextResponse.json(
        { error: data.error ?? "No agent connected." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Start the agent gateway (npm run agent-gateway in the app folder), then start the agent." },
      { status: 503 }
    );
  }
}
