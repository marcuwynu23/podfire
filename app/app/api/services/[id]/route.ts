import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeStack } from "@/lib/stack";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const service = await prisma.service.findFirst({
    where: { id, userId },
    include: {
      deployments: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(service);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const service = await prisma.service.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: {
    port?: number | null;
    hostPort?: number | null;
    replicas?: number;
    domain?: string | null;
    cpuLimit?: string | null;
    memoryLimit?: string | null;
    entryCommand?: string | null;
    buildCommand?: string | null;
    env?: Record<string, string> | null;
    deployMode?: "manual" | "auto";
    diagnosticsEnabled?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { port, hostPort, replicas, domain, cpuLimit, memoryLimit, entryCommand, buildCommand, env, deployMode, diagnosticsEnabled } = body;
  if (port !== undefined && (typeof port !== "number" || port < 1 || port > 65535)) {
    return NextResponse.json({ error: "port must be 1-65535" }, { status: 400 });
  }
  if (hostPort !== undefined && hostPort !== null && (typeof hostPort !== "number" || hostPort < 1 || hostPort > 65535)) {
    return NextResponse.json({ error: "hostPort must be 1-65535" }, { status: 400 });
  }
  if (replicas !== undefined && (typeof replicas !== "number" || replicas < 1 || replicas > 32)) {
    return NextResponse.json({ error: "replicas must be 1-32" }, { status: 400 });
  }
  const data: { port?: number | null; hostPort?: number | null; replicas?: number; domain?: string | null; cpuLimit?: string | null; memoryLimit?: string | null; entryCommand?: string | null; buildCommand?: string | null; env?: string | null; deployMode?: string; diagnosticsEnabled?: boolean } = {};
  if (port !== undefined) data.port = port ?? null;
  if (hostPort !== undefined) data.hostPort = hostPort ?? null;
  if (replicas !== undefined) data.replicas = replicas;
  if (domain !== undefined) data.domain = typeof domain === "string" ? domain.trim() || null : null;
  if (cpuLimit !== undefined) data.cpuLimit = typeof cpuLimit === "string" ? cpuLimit.trim() || null : null;
  if (memoryLimit !== undefined) data.memoryLimit = typeof memoryLimit === "string" ? memoryLimit.trim() || null : null;
  if (entryCommand !== undefined) data.entryCommand = entryCommand?.trim() || null;
  if (buildCommand !== undefined) data.buildCommand = buildCommand?.trim() || null;
  if (env !== undefined) data.env = env && typeof env === "object" ? JSON.stringify(env) : null;
  if (deployMode !== undefined) data.deployMode = deployMode === "auto" ? "auto" : "manual";
  if (diagnosticsEnabled !== undefined) data.diagnosticsEnabled = Boolean(diagnosticsEnabled);
  const updated = await prisma.service.update({
    where: { id: service.id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const service = await prisma.service.findFirst({
    where: { id, userId },
    select: { id: true, stackName: true, name: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const stackName = service.stackName ?? service.name;
    removeStack(stackName);
  } catch {
    // ignore stack rm failures (e.g. stack never deployed)
  }
  await prisma.service.delete({ where: { id: service.id } });
  return NextResponse.json({ deleted: true });
}
