import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppDetailTabs } from "./AppDetailTabs";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const { id } = await params;
  const service = await prisma.service.findFirst({
    where: { id, userId },
    include: {
      deployments: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!service) redirect("/dashboard/apps");

  const latestDeployment = service.deployments[0] ?? null;

  return (
    <div className="w-full">
      <AppDetailTabs
        service={service}
        deployments={service.deployments}
        latestDeployment={latestDeployment}
      />
    </div>
  );
}
