import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

function StatusPill({ status }: { status: string }) {
  const s = status === "—" ? "idle" : status;
  const styles: Record<string, string> = {
    running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
    building: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    pushing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    deploying: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    queued: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    idle: "bg-zinc-500/10 text-zinc-500 border-white/10",
  };
  const style = styles[s] ?? styles.idle;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {s === "idle" ? "—" : s}
    </span>
  );
}

function RepoSlug(repoUrl: string) {
  try {
    const u = new URL(repoUrl);
    const path = u.pathname.replace(/\.git$/, "").replace(/^\//, "");
    return path || repoUrl;
  } catch {
    return repoUrl;
  }
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
            Deploy and manage applications from GitHub.
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const status = s.deployments[0]?.status ?? "—";
            const repoSlug = RepoSlug(s.repoUrl);
            return (
              <Link
                key={s.id}
                href={`/dashboard/apps/${s.id}`}
                className="group rounded-native border border-white/[0.06] bg-gl-card p-5 shadow-sm transition hover:border-primary/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-white group-hover:text-primary">
                      {s.name}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-zinc-500" title={repoSlug}>
                      {repoSlug}
                    </p>
                  </div>
                  <StatusPill status={status} />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                  <span>{s.branch}</span>
                  {s.deployments[0]?.createdAt && (
                    <span>
                      {new Date(s.deployments[0].createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  View app
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
