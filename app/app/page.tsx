import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 px-4 sm:px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Dockly
        </h1>
        <p className="mt-2 text-zinc-400">
          Internal Render-like PaaS — Deploy from GitHub with Docker Stack
        </p>
      </div>
      {error === "oauth_not_configured" && (
        <div className="w-full max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm text-amber-200">
          <p className="font-medium">GitHub OAuth is not configured.</p>
          <p className="mt-2 text-amber-200/90">
            1. Go to{" "}
            <a
              href="https://github.com/settings/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              GitHub → Settings → Developer settings → OAuth Apps
            </a>
            <br />
            2. New OAuth App: set Application name, Homepage URL (e.g. http://localhost:3000), and
            <strong> Authorization callback URL</strong> to{" "}
            <code className="rounded bg-black/30 px-1">http://localhost:3000/api/github/callback</code>
            <br />
            3. Copy the Client ID and generate a Client secret, then add to your <code className="rounded bg-black/30 px-1">.env</code>:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-3 font-mono text-xs">
            {"GITHUB_CLIENT_ID=your_client_id\nGITHUB_CLIENT_SECRET=your_client_secret\nGITHUB_CALLBACK_URL=http://localhost:3000/api/github/callback"}
          </pre>
          <p className="mt-2 text-amber-200/90">Restart the dev server after changing .env.</p>
        </div>
      )}
      {error && error !== "oauth_not_configured" && (
        <p className="rounded-md bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error === "github_denied"
            ? "GitHub authorization was denied."
            : error === "no_code"
              ? "Missing authorization code."
              : error === "auth_failed"
                ? "Authentication failed. Please try again."
                : "Something went wrong."}
        </p>
      )}
      <Link
        href="/api/github/auth"
        className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-500"
      >
        Sign in with GitHub
      </Link>
    </div>
  );
}
