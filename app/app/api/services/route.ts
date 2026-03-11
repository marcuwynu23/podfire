import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sanitizeStackName } from "@/lib/stack";

function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64) || "service";
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const services = await prisma.service.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return NextResponse.json(
    services.map((s) => ({
      ...s,
      lastDeployment: s.deployments[0] ?? null,
      deployments: undefined,
    }))
  );
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    name: string;
    repoUrl: string;
    branch: string;
    domain?: string | null;
    port?: number | null;
    hostPort?: number | null;
    entryCommand?: string | null;
    buildCommand?: string | null;
    env?: Record<string, string> | null;
    deployMode?: "manual" | "auto";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, repoUrl, branch, domain, port, hostPort, entryCommand, buildCommand, env, deployMode } = body;
  if (!name || !repoUrl) {
    return NextResponse.json({ error: "name and repoUrl required" }, { status: 400 });
  }
  const safeName = sanitizeName(name);
  const stackName = sanitizeStackName(safeName);
  const existing = await prisma.service.findFirst({
    where: { userId, stackName },
  });
  if (existing) {
    return NextResponse.json({ error: "Service with this name already exists" }, { status: 409 });
  }
  const envStr = env && typeof env === "object" ? JSON.stringify(env) : null;
  const mode = deployMode === "auto" ? "auto" : "manual";
  const domainTrimmed = typeof domain === "string" ? domain.trim() || null : null;
  const service = await prisma.service.create({
    data: {
      userId,
      name: safeName,
      repoUrl: repoUrl.trim(),
      branch: (branch || "main").trim(),
      stackName,
      domain: domainTrimmed,
      port: port != null && port >= 1 && port <= 65535 ? port : null,
      hostPort: hostPort != null && hostPort >= 1 && hostPort <= 65535 ? hostPort : null,
      entryCommand: entryCommand?.trim() || null,
      buildCommand: buildCommand?.trim() || null,
      env: envStr,
      deployMode: mode,
    },
  });
  return NextResponse.json(service);
}
