"use client";

import {useState, useEffect} from "react";
import {DashboardNav} from "./DashboardNav";
import {useDashboardMobile} from "./DashboardMobileContext";

const STORAGE_KEY = "dashboard-sidebar-collapsed";

export function DashboardSidebarShell({
  displayName,
  children,
}: {
  displayName: string | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const {mobileMenuOpen, setMobileMenuOpen} = useDashboardMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setCollapsed(raw === "true");
    } catch {
      setCollapsed(false);
    }
  }, [mounted]);

  const persistCollapsed = (value: boolean) => {
    setCollapsed(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex flex-1">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeMobileMenu}
          className="fixed inset-0 top-11 z-30 bg-black/50 md:hidden"
        />
      )}
      <aside
        className={`fixed top-11 z-40 flex h-[calc(100vh-2.75rem)] flex-col border-[color:var(--gl-edge)] bg-gl-sidebar transition-[width,transform] duration-200 ease-out
          right-0 left-auto w-56 border-l
          md:left-0 md:right-auto md:border-l-0 md:border-r
          ${collapsed ? "md:w-[4rem]" : "md:w-56"}
          ${mobileMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}
      >
        <DashboardNav collapsed={collapsed} onNavigate={closeMobileMenu} />
        {/* Mobile only: account section */}
        <div className="mt-auto flex flex-col border-t border-[color:var(--gl-edge)] p-3 md:hidden">
          <div className="border-b border-[color:var(--gl-edge)] pb-3">
            <p className="truncate text-sm font-medium text-[color:var(--gl-text)]">
              {displayName ?? "Account"}
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--gl-text-muted)]">
              Signed in with GitHub
            </p>
          </div>
          <form action="/api/github/logout" method="post" className="pt-3">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-[color:var(--gl-text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
            >
              Log out
            </button>
          </form>
        </div>
        <div className="mt-auto hidden border-t border-[color:var(--gl-edge)] p-2 md:block">
          <button
            type="button"
            onClick={() => persistCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--gl-text-muted)] transition hover:bg-[var(--gl-card-hover)] hover:text-[color:var(--gl-text)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className="h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{transform: collapsed ? "rotate(180deg)" : undefined}}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
            {!collapsed}
          </button>
        </div>
      </aside>
      <main
        className={`min-h-[calc(100vh-2.75rem)] min-w-0 flex-1 overflow-x-hidden overflow-y-auto pt-0 transition-[padding-left] duration-200 ease-out px-3 pl-0 md:px-4 ${collapsed ? "md:pl-16" : "md:pl-56"}`}
      >
        {children}
      </main>
    </div>
  );
}
