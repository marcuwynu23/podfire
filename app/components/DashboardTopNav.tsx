"use client";

import Link from "next/link";
import {useState, useRef, useEffect} from "react";
import {ThemeSwitch} from "./ThemeProvider";

export function DashboardTopNav({displayName}: {displayName: string | null}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--gl-edge)] bg-gl-sidebar/95 shadow-sm backdrop-blur-md">
      <div className="flex h-11 w-full items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 transition hover:opacity-90"
        >
          <img src="/favicon.svg" alt="" className="h-8 w-8" aria-hidden />
          <span className="flex flex-col">
            <span className="text-fire text-base font-semibold leading-tight">
              PodFire
            </span>
            <span className="text-[10px] font-normal text-[color:var(--gl-text-muted)] leading-tight">
              Deployment platform
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <Link
            href="/dashboard/apps/new"
            className="btn-fire rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition"
          >
            Create App
          </Link>
          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-gl-edge bg-gl-input-bg px-2.5 py-1.5 shadow-sm transition hover:border-primary/20 hover:bg-primary/10"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-primary">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span className="max-w-[120px] truncate text-sm font-medium text-[color:var(--gl-text)] sm:max-w-[160px]">
                {displayName ?? "Account"}
              </span>
              <svg
                className={`h-3.5 w-3.5 text-[color:var(--gl-text-muted)] transition ${profileOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-[color:var(--gl-edge)] bg-gl-card py-2 shadow-sm">
                <div className="border-b border-[color:var(--gl-edge)] px-3 py-2">
                  <p className="truncate text-sm font-medium text-[color:var(--gl-text)]">
                    {displayName ?? "Account"}
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--gl-text-muted)]">
                    Signed in with GitHub
                  </p>
                </div>
                <form action="/api/github/logout" method="post" className="p-2">
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--gl-text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    Log out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
