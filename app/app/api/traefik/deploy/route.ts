import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

const GATEWAY_URL = process.env.AGENT_GATEWAY_URL ?? "http://localhost:3001";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let yaml: string;
  try {
    const stackPath = path.join(process.cwd(), "traefik", "traefik-stack.yml");
    yaml = fs.readFileSync(stackPath, "utf-8");
  } catch (err) {
    return NextResponse.json(
      { error: "Traefik stack file not found" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/traefik/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yaml }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Deploy failed" },
        { status: res.status }
      );
    }
    if (!data.ok) {
      return NextResponse.json(
        { error: data.error ?? "No agent connected. Start the agent first." },
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
