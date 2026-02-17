import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getCounts(userId: string) {
  const appCount = await prisma.service.count({ where: { userId } });
  // Fix: prisma.agent does not exist, so use prisma.service instead
  // If you want a count of agent-like objects, replace 'service' with the correct model (if available)
  const agentCount = 0; // Placeholder: Replace with correct count if the agents table/model exists
  return { appCount, agentCount };
}

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const { appCount, agentCount } = await getCounts(userId);

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Your apps, agents, and gateway at a glance.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/apps"
          className="group rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm transition hover:border-primary/20"
        >
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-primary/15 p-3 shadow-sm">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">{appCount}</span>
          </div>
          <h2 className="mt-4 text-base font-semibold text-white">Apps</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Manage and deploy from GitHub.
          </p>
          <span className="mt-4 inline-flex items-center text-sm font-medium text-primary transition group-hover:underline">
            View apps
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>

        <Link
          href="/dashboard/agents"
          className="group rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm transition hover:border-primary/20"
        >
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-primary/15 p-3 shadow-sm">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">{agentCount}</span>
          </div>
          <h2 className="mt-4 text-base font-semibold text-white">Agents</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Run agents to execute deploys.
          </p>
          <span className="mt-4 inline-flex items-center text-sm font-medium text-primary transition group-hover:underline">
            Manage agents
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>

        <Link
          href="/dashboard/gateway"
          className="group rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm transition hover:border-primary/20"
        >
          <div className="w-fit rounded-xl bg-primary/15 p-3 shadow-sm">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-semibold text-white">Gateway</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Reverse proxy for *.localhost routing.
          </p>
          <span className="mt-4 inline-flex items-center text-sm font-medium text-primary transition group-hover:underline">
            Open Gateway
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </div>

      <div className="mt-8">
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
    </div>
  );
}
