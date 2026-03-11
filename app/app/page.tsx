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
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-lg space-y-10 text-center">
          {/* Logo / Brand */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <img src="/favicon.svg" alt="" className="h-16 w-16 sm:h-20 sm:w-20" aria-hidden />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              PodFire
            </h1>
            <p className="mx-auto max-w-md text-lg text-zinc-400 sm:text-xl">
              Deploy from source code management. One dashboard, agents, routing, and DNS. Own your infrastructure.
            </p>
          </div>

          {/* Features row */}
          <ul className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              GitHub repos
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Auto or manual deploy
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Traefik reverse proxy
            </li>
          </ul>

          {/* Error states */}
          {error === "oauth_not_configured" && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-5 text-left">
              <p className="font-semibold text-amber-200">GitHub OAuth is not configured</p>
              <p className="mt-2 text-sm text-amber-200/90">
                1. In{" "}
                <a
                  href="https://github.com/settings/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:no-underline"
                >
                  GitHub → Developer settings → OAuth Apps
                </a>
                , create a new OAuth App.
                <br />
                2. Set Homepage URL and <strong>Authorization callback URL</strong> to{" "}
                <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">
                  http://localhost:3000/api/github/callback
                </code>
                <br />
                3. Add to <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">.env</code>:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs text-zinc-300">
                {"GITHUB_CLIENT_ID=...\nGITHUB_CLIENT_SECRET=...\nGITHUB_CALLBACK_URL=http://localhost:3000/api/github/callback"}
              </pre>
              <p className="mt-2 text-xs text-amber-200/80">Restart the server after changing .env.</p>
            </div>
          )}
          {error && error !== "oauth_not_configured" && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error === "github_denied"
                ? "GitHub authorization was denied."
                : error === "no_code"
                  ? "Missing authorization code."
                  : error === "auth_failed"
                    ? "Authentication failed. Please try again."
                    : "Something went wrong."}
            </div>
          )}

          {/* CTA */}
          <div className="pt-2">
            <Link
              href="/api/github/auth"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover hover:shadow-primary/25 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Sign in with GitHub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
