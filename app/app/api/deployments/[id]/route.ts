import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const deployment = await prisma.deployment.findFirst({
    where: { id },
    include: {
      service: { select: { userId: true } },
    },
  });
  if (!deployment || deployment.service.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { service, ...rest } = deployment;
  return NextResponse.json(rest);
}
