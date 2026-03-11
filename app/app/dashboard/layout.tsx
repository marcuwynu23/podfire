import {redirect} from "next/navigation";
import {getSessionUser} from "@/lib/auth";
import {DashboardNav} from "./DashboardNav";
import {DashboardTopNav} from "./DashboardTopNav";
import {ThemeProvider} from "./ThemeProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const displayName = user.githubLogin ?? user.email ?? "Account";

  return (
    <ThemeProvider>
      <div className="flex min-h-screen w-full flex-col">
        <DashboardTopNav displayName={displayName} />

        <div className="flex flex-1">
          <aside className="fixed left-0 top-11 z-30 flex h-[calc(100vh-2.75rem)] w-56 flex-col border-r border-[color:var(--gl-edge)] bg-gl-sidebar">
            <DashboardNav />
          </aside>

          <main className="min-h-[calc(100vh-2.75rem)] flex-1 pl-56 pt-0">
            <div className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
