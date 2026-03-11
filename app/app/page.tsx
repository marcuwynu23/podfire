import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{error?: string}>;
}) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--gl-bg)] lg:flex-row">
      {/* Left: information + gradient */}
      <section className="relative flex flex-1 flex-col justify-center px-6 py-16 lg:w-3/4 lg:px-16 lg:py-20 hero-bg-animated">
        <div className="relative mx-auto w-full max-w-lg space-y-10">
          <div>
            <img src="/favicon.svg" alt="PodFire" className="h-14 w-14" />
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--gl-text)] sm:text-4xl lg:text-5xl">
              PodFire
            </h1>
            <p className="mt-3 text-base text-[var(--gl-text-muted)]">
              Self‑hosted app platform. Deploy containers from your repo.
            </p>
          </div>
          <p className="text-base leading-relaxed text-[var(--gl-text-muted)]">
            Connect GitHub or GitLab, point at a repository, and let agents
            build and deploy. One dashboard for agents, routing, and DNS—from
            commit to production.
          </p>
          <ul className="space-y-2.5 text-sm text-[var(--gl-text-muted)]">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              GitHub &amp; GitLab
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              Traefik gateway &amp; TLS
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              Per‑app logs, rollbacks, diagnostics
            </li>
          </ul>
        </div>
      </section>

      {/* Right: login (narrow, centered) */}
      <section className="flex flex-col items-center justify-center border-t border-[var(--gl-edge)] bg-[var(--gl-bg)] px-6 py-12 lg:w-1/4 lg:shrink-0 lg:border-l lg:border-t-0 lg:px-8 lg:py-16">
        <div className="mx-auto w-full max-w-xs space-y-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            <span className="text-fire">Sign in</span>
          </h2>

          {error === "oauth_not_configured" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <p className="font-medium">OAuth not configured</p>
              <p className="mt-1 text-xs text-amber-200/90">
                Set up GitHub/GitLab OAuth in settings. Callback:{" "}
                <code className="rounded bg-black/30 px-1 font-mono text-[10px]">
                  /api/github/callback
                </code>
              </p>
            </div>
          )}
          {error && error !== "oauth_not_configured" && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
              {error === "github_denied"
                ? "GitHub authorization denied."
                : error === "no_code"
                  ? "Missing authorization code."
                  : error === "auth_failed"
                    ? "Authentication failed."
                    : "Something went wrong."}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href="/api/github/auth"
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Sign in with GitHub
            </Link>
            <Link
              href="/api/gitlab/auth"
              className="flex items-center justify-center gap-2 rounded-lg border border-[var(--gl-edge)] bg-[var(--gl-card)] py-3 text-sm font-medium text-[var(--gl-text)] transition hover:bg-[var(--gl-hover)]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M21.86 13.22 20.09 7.76a.78.78 0 0 0-.75-.53.77.77 0 0 0-.74.54l-1.18 3.64h-6.84L9.4 7.77a.77.77 0 0 0-.74-.54.78.78 0 0 0-.75.53L6.14 13.22a1.63 1.63 0 0 0 .6 1.82l5.12 3.72a1.02 1.02 0 0 0 1.2 0l5.12-3.72a1.63 1.63 0 0 0 .6-1.82Z"
                  fill="currentColor"
                />
              </svg>
              Sign in with GitLab
            </Link>
          </div>

          <p className="text-xs text-[var(--gl-text-muted)]">
            Your Git provider only. No third‑party accounts.
          </p>
        </div>
      </section>
    </div>
  );
}
