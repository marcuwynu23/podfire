import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--gl-bg)]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-primary/25 via-primary/5 to-transparent blur-3xl opacity-70" />

      {/* Layout */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        {/* Top bar */}
        <header className="mb-10 flex w-full items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">Agent‑ready</span>
            <span className="sm:hidden">Online</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline sm:inline"
            >
              Docs
            </Link>
            <span className="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-300">
              Private preview
            </span>
          </nav>
        </header>

        <main className="grid w-full gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-stretch">
          {/* Left: hero + CTA */}
          <section className="flex flex-col justify-center">
            <div className="space-y-8">
              {/* Logo / Brand */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200 backdrop-blur">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Deploy from your own GitHub or GitLab
                </div>
                <div className="flex items-center gap-4">
                  <img
                    src="/favicon.svg"
                    alt="PodFire logo"
                    className="h-12 w-12 rounded-2xl bg-black/40 p-2 shadow-lg shadow-primary/30 sm:h-14 sm:w-14"
                  />
                  <div className="text-left">
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                      PodFire
                    </h1>
                    <p className="mt-1 text-sm font-medium uppercase tracking-[0.16em] text-primary/80">
                      Self‑hosted app platform
                    </p>
                  </div>
                </div>
                <p className="max-w-xl text-base text-zinc-300 sm:text-lg">
                  Deploy containers straight from your source control. PodFire
                  gives you a unified dashboard for agents, routing, and DNS so
                  you can own the full path from commit to production.
                </p>
              </div>

              {/* Feature bullets */}
              <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  GitHub &amp; GitLab repos
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  One‑click or CI‑driven deploys
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Traefik gateway &amp; DNS automation
                </li>
              </ul>

              {/* Error states */}
              {error === "oauth_not_configured" && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm text-amber-100 shadow-sm shadow-amber-500/10">
                  <p className="font-semibold">
                    OAuth is not configured for this environment
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-amber-100/90">
                    Configure GitHub and/or GitLab OAuth in your settings.
                    For GitHub, create an OAuth App and set the callback URL to:
                  </p>
                  <code className="mt-2 inline-block rounded bg-black/40 px-2 py-1 font-mono text-[11px]">
                    http://localhost:3000/api/github/callback
                  </code>
                  <p className="mt-2 text-[11px] text-amber-100/80">
                    After updating environment variables, restart the server.
                  </p>
                </div>
              )}
              {error && error !== "oauth_not_configured" && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-sm shadow-red-500/10">
                  {error === "github_denied"
                    ? "GitHub authorization was denied."
                    : error === "no_code"
                    ? "Missing authorization code."
                    : error === "auth_failed"
                    ? "Authentication failed. Please try again."
                    : "Something went wrong."}
                </div>
              )}

              {/* CTAs: GitHub + GitLab */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/api/github/auth"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:shadow-primary/30 active:scale-[0.98]"
                >
                  <svg
                    className="h-5 w-5"
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
                  <span>Sign in with GitHub</span>
                </Link>

                <Link
                  href="/api/gitlab/auth"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-white/5 px-7 py-3.5 text-sm font-semibold text-zinc-100 shadow-sm shadow-black/20 transition hover:border-primary hover:bg-white/10 active:scale-[0.98]"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      d="M21.86 13.22 20.09 7.76a.78.78 0 0 0-.75-.53.77.77 0 0 0-.74.54l-1.18 3.64h-6.84L9.4 7.77a.77.77 0 0 0-.74-.54.78.78 0 0 0-.75.53L6.14 13.22a1.63 1.63 0 0 0 .6 1.82l5.12 3.72a1.02 1.02 0 0 0 1.2 0l5.12-3.72a1.63 1.63 0 0 0 .6-1.82Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Sign in with GitLab</span>
                </Link>

                <p className="text-xs text-zinc-500">
                  SSO only for your own Git providers. No third‑party accounts.
                </p>
              </div>
            </div>
          </section>

          {/* Right: feature panel */}
          <aside className="flex items-center">
            <div className="w-full rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950/90 via-zinc-900/90 to-primary/20 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7 lg:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Platform overview
              </h2>
              <p className="mt-3 text-sm text-zinc-300">
                PodFire treats your infrastructure as a small, focused platform:
              </p>

              <div className="mt-5 space-y-4 text-sm text-zinc-200">
                <div className="flex gap-3">
                  <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-xl bg-primary/20 text-primary">
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold">
                      SCM
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">Source control first</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Connect GitHub or GitLab, point at a repo, and let agents
                      build and deploy your containers.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-xl bg-emerald-400/20 text-emerald-300">
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold">
                      GW
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">Gateway &amp; routing</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Traefik frontends each stack over a shared network, so
                      apps stay isolated while sharing TLS and DNS.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-xl bg-sky-400/20 text-sky-300">
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold">
                      OPS
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">Operational views</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Per‑app diagnostics, logs, and rollbacks are just a click
                      away, backed by a lightweight agent model.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-zinc-500">
                <span>Bring your own cluster &amp; DNS.</span>
                <span>Designed for small teams and labs.</span>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
