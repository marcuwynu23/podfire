type Props = {
  repoUrl: string;
  branch: string;
  stackName: string | null;
  currentReplicas: number;
  appUrl: string;
};

export function InfoTab({ repoUrl, branch, stackName, currentReplicas, appUrl }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold text-white">Information</h2>
      <p className="mt-0.5 text-sm text-zinc-400">
        Repository and runtime details for this app.
      </p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Repository
          </dt>
          <dd className="mt-1 font-mono text-sm text-zinc-300 break-all">{repoUrl}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Branch
          </dt>
          <dd className="mt-1 font-mono text-sm text-zinc-300">{branch}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Stack name
          </dt>
          <dd className="mt-1 font-mono text-sm text-zinc-300">{stackName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Scale (replicas)
          </dt>
          <dd className="mt-1 font-mono text-sm text-zinc-300">{currentReplicas}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            App URL
          </dt>
          <dd className="mt-1">
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline"
            >
              {appUrl}
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}
