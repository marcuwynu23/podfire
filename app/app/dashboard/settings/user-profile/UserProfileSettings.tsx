"use client";

type User = {
  id: string;
  email: string | null;
  githubId: string | null;
  githubLogin: string | null;
};

export function UserProfileSettings({ user }: { user: User }) {
  const displayName = user.githubLogin ?? user.email ?? "Account";

  return (
    <section className="rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gl-text">User & profile</h2>
      <p className="mt-1 text-sm text-gl-text-muted">
        Your account information. Changes to profile are managed via GitHub.
      </p>
      <dl className="mt-4 space-y-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            Display name
          </dt>
          <dd className="mt-0.5 text-sm text-gl-text">{displayName}</dd>
        </div>
        {user.email && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
              Email
            </dt>
            <dd className="mt-0.5 text-sm text-gl-text">{user.email}</dd>
          </div>
        )}
        {user.githubLogin && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
              GitHub
            </dt>
            <dd className="mt-0.5 text-sm text-gl-text">{user.githubLogin}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
