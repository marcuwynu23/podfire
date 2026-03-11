"use client";

import { ThemeProvider } from "./ThemeProvider";
import { DashboardMobileProvider } from "./DashboardMobileContext";
import { DashboardTopNav } from "./DashboardTopNav";
import { DashboardSidebarShell } from "./DashboardSidebarShell";

export function DashboardLayoutClient({
  displayName,
  children,
}: {
  displayName: string | null;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <DashboardMobileProvider>
        <div className="flex min-h-screen w-full flex-col">
          <DashboardTopNav displayName={displayName} />
          <DashboardSidebarShell displayName={displayName}>
            <div className="min-w-0 w-full flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-6">
              {children}
            </div>
          </DashboardSidebarShell>
        </div>
      </DashboardMobileProvider>
    </ThemeProvider>
  );
}
