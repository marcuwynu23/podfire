import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppsList } from "./AppsList";

async function getServices(userId: string) {
  return prisma.service.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export default async function AppsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const services = await getServices(userId);

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← Overview
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Apps
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Connect GitHub repos and deploy to Docker Swarm. Each app gets a <code className="rounded border border-white/[0.06] bg-black/20 px-1">*.localhost</code> URL when the Gateway is running.
          </p>
        </div>
        <Link
          href="/dashboard/apps/new"
          className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create App
        </Link>
      </div>

      {services.length === 0 ? (
        <div className="rounded-native border border-white/[0.06] bg-gl-card p-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gl-border/50">
            <svg className="h-7 w-7 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">No apps yet</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Connect a repository to deploy your first app.
          </p>
          <Link
            href="/dashboard/apps/new"
            className="mt-6 inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover"
          >
            Create your first app
          </Link>
        </div>
      ) : (
        <AppsList services={services} />
      )}
    </div>
  );
}
