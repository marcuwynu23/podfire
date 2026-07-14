import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gatewayFetch } from "@/lib/gateway-auth";

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
    select: { stackName: true, name: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stackName = service.stackName ?? service.name;
  try {
    const res = await gatewayFetch(
      `/service-logs?stackName=${encodeURIComponent(stackName)}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as { logs?: string | null; error?: string | null };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Failed to fetch logs", logs: null },
        { status: res.status }
      );
    }
    return NextResponse.json({ logs: data.logs ?? null });
  } catch {
    return NextResponse.json(
      { error: "Agent gateway not reachable", logs: null },
      { status: 503 }
    );
  }
}
