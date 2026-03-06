import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Confirm an agent key. The agent generates a secret and prints it; the user
 * pastes it here. Once confirmed, the agent can register with the gateway using this key.
 */
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { secret?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const secret = typeof body.secret === "string" ? body.secret.trim() : "";
  if (!secret) {
    return NextResponse.json({ error: "Secret (agent key) is required" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() || null : null;

  const existing = await prisma.agentRegistrationKey.findUnique({
    where: { secret },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This key is already confirmed. Start the agent and it will connect." },
      { status: 409 }
    );
  }

  await prisma.agentRegistrationKey.create({
    data: { secret, userId, name },
  });

  return NextResponse.json({
    ok: true,
    message: "Key confirmed. Start (or restart) the agent; it will register using this key.",
  });
}
