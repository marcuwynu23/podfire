import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET latest deployment status for a service (for polling during deploy).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const latest = await prisma.deployment.findFirst({
    where: { service: { id, userId } },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });
  if (!latest) {
    return NextResponse.json({ status: "—" });
  }
  return NextResponse.json({ status: latest.status });
}
