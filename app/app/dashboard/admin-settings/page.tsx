import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminSettingsTabs } from "./AdminSettingsTabs";

type ServiceForGateway = {
  id: string;
  name: string;
  stackName: string | null;
  domain: string | null;
  deployments: { status: string }[];
};

async function getDeployedServices(userId: string): Promise<ServiceForGateway[]> {
  const list = await prisma.service.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });
  return list.map((s) => ({
    id: s.id,
    name: s.name,
    stackName: s.stackName,
    domain: (s as { domain?: string | null }).domain ?? null,
    deployments: s.deployments,
  }));
}

export default async function AdminSettingsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const services = await getDeployedServices(userId);

  return (
    <div className="min-w-0 w-full space-y-4 sm:space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-gl-text-muted transition hover:text-gl-text"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-gl-text sm:text-2xl">
          Admin settings
        </h1>
        <p className="mt-1 text-sm text-gl-text-muted">
          Gateway, Cloudflare, GitHub, and Docker registry configuration.
        </p>
      </div>

      <AdminSettingsTabs services={services} />
    </div>
  );
}
