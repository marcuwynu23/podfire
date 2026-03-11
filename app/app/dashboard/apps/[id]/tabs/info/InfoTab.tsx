type Props = {
  repoUrl: string;
  branch: string;
  stackName: string | null;
  currentReplicas: number;
  appUrl: string;
};

export function InfoTab({ repoUrl, branch, stackName, currentReplicas, appUrl }: Props) {
  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-base font-semibold text-gl-text">Information</h2>
      <p className="mt-0.5 text-sm text-gl-text-muted">
        Repository and runtime details for this app.
      </p>
      <dl className="mt-4 grid gap-4 sm:mt-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            Repository
          </dt>
          <dd className="mt-1 font-mono text-sm text-gl-text-muted break-all">{repoUrl}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            Branch
          </dt>
          <dd className="mt-1 font-mono text-sm text-gl-text-muted">{branch}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            Stack name
          </dt>
          <dd className="mt-1 font-mono text-sm text-gl-text-muted">{stackName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
            Scale (replicas)
          </dt>
          <dd className="mt-1 font-mono text-sm text-gl-text-muted">{currentReplicas}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wider text-gl-text-muted">
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
