import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardNav } from "./DashboardNav";
import { DashboardTopNav } from "./DashboardTopNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const accountLabel = user.email ?? user.githubId ?? "Account";

  return (
    <div className="flex min-h-screen w-full flex-col">
      <DashboardTopNav accountLabel={accountLabel} />

      <div className="flex flex-1">
        <aside className="fixed left-0 top-11 z-30 flex h-[calc(100vh-2.75rem)] w-56 flex-col border-r border-white/[0.06] bg-gl-sidebar">
          <DashboardNav />
          <div className="mt-auto border-t border-white/[0.06] p-3">
            <p className="truncate px-3 py-1.5 text-xs text-zinc-500" title={accountLabel}>
              {accountLabel}
            </p>
            <form action="/api/github/logout" method="post" className="mt-1">
              <button
                type="submit"
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
              >
                Log out
              </button>
            </form>
          </div>
        </aside>

        <main className="min-h-[calc(100vh-2.75rem)] flex-1 pl-56 pt-0">
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
