"use client";

import { useState, useMemo, Fragment } from "react";
import { ServiceDiagnosticsBlock } from "../../apps/[id]/tabs/props";
import { AppLogsViewer } from "../../apps/[id]/log/AppLogsViewer";

const PAGE_SIZE = 10;

type Service = {
  id: string;
  name: string;
  stackName: string | null;
  domain: string | null;
  deployments: { status: string }[];
};

function getHostDisplay(s: Service): string {
  const host = (s.stackName ?? s.name).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return s.domain ? `${host}.${s.domain}` : `${host}.localhost`;
}

export function AppDiagnosticsTable({ services }: { services: Service[] }) {
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(services.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const paginated = useMemo(
    () => services.slice(start, start + PAGE_SIZE),
    [services, start],
  );

  if (services.length === 0) {
    return (
      <div className="rounded-native border border-gl-edge bg-gl-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-2 text-lg font-medium text-gl-text">App Diagnostics</h2>
        <p className="text-sm text-gl-text-muted">
          No apps yet. Create one from the dashboard to run diagnostics and view logs.
        </p>
      </div>
    );
  }

  const expandedContentInner = (s: Service, hostDisplay: string) => (
    <div className="space-y-6">
      <ServiceDiagnosticsBlock
        serviceId={s.id}
        expectedHost={hostDisplay}
      />
      <div>
        <h4 className="mb-2 text-sm font-medium text-gl-text">
          Runtime logs
        </h4>
        <AppLogsViewer serviceId={s.id} live={false} />
      </div>
    </div>
  );

  return (
    <div className="min-w-0 rounded-native border border-gl-edge bg-gl-card shadow-sm">
      <div className="border-b border-gl-edge px-4 py-3 sm:px-6 sm:py-4">
        <h2 className="text-lg font-medium text-gl-text">App Diagnostics</h2>
        <p className="mt-0.5 text-sm text-gl-text-muted">
          Run service diagnostics and view logs per app. Pagination: 10 per page.
        </p>
      </div>

      {/* Mobile: list of cards */}
      <ul className="min-w-0 divide-y divide-gl-edge sm:hidden" role="list">
        {paginated.map((s) => {
          const hostDisplay = getHostDisplay(s);
          const latest = s.deployments[0]?.status ?? "—";
          const isExpanded = expandedId === s.id;
          return (
            <li key={s.id} className="min-w-0">
              <div className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gl-text">{s.name}</span>
                  <span className="text-sm text-gl-text-muted">{latest}</span>
                </div>
                <p className="truncate font-mono text-xs text-gl-text-muted">
                  {hostDisplay}
                </p>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="w-full rounded-xl border border-gl-edge bg-gl-input-bg py-2 text-xs font-medium text-gl-text transition hover:bg-gl-hover sm:w-auto sm:px-3 sm:py-1.5"
                >
                  {isExpanded ? "Hide" : "Diagnostics"}
                </button>
              </div>
              {isExpanded && (
                <div className="border-t border-gl-edge bg-gl-input-bg/30 p-3">
                  {expandedContentInner(s, hostDisplay)}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Desktop: table */}
      <div className="scrollbar-thin max-h-[24rem] overflow-auto overflow-x-auto sm:max-h-[28rem] hidden sm:block">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm sm:min-w-[32rem]">
          <thead>
            <tr className="border-b border-gl-edge bg-gl-input-bg/50">
              <th className="px-2 py-2 font-medium text-gl-text sm:px-4 sm:py-3">App</th>
              <th className="px-2 py-2 font-medium text-gl-text sm:px-4 sm:py-3">Host</th>
              <th className="px-2 py-2 font-medium text-gl-text sm:px-4 sm:py-3">Status</th>
              <th className="w-28 px-2 py-2 font-medium text-gl-text sm:w-32 sm:px-4 sm:py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gl-text-muted">
            {paginated.map((s) => {
              const hostDisplay = getHostDisplay(s);
              const latest = s.deployments[0]?.status ?? "—";
              const isExpanded = expandedId === s.id;
              return (
                <Fragment key={s.id}>
                  <tr
                    className="border-b border-gl-edge transition hover:bg-gl-hover"
                  >
                    <td className="max-w-[6rem] truncate px-2 py-2 font-medium text-gl-text sm:max-w-none sm:px-4 sm:py-3">{s.name}</td>
                    <td className="max-w-[8rem] truncate px-2 py-2 font-mono text-xs sm:max-w-none sm:px-4 sm:py-3">{hostDisplay}</td>
                    <td className="shrink-0 px-2 py-2 sm:px-4 sm:py-3">{latest}</td>
                    <td className="shrink-0 px-2 py-2 sm:px-4 sm:py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="rounded-xl border border-gl-edge bg-gl-input-bg px-2 py-1.5 text-xs font-medium text-gl-text transition hover:bg-gl-hover sm:px-3"
                      >
                        {isExpanded ? "Hide" : "Diagnostics"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-gl-edge bg-gl-input-bg/30">
                      <td colSpan={4} className="p-3 sm:p-4">
                        {expandedContentInner(s, hostDisplay)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-2 border-t border-gl-edge px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 sm:py-3">
          <p className="text-xs text-gl-text-muted">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, services.length)} of{" "}
            {services.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-1.5 text-xs font-medium text-gl-text transition hover:bg-gl-hover disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Previous
            </button>
            <span className="text-xs text-gl-text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-1.5 text-xs font-medium text-gl-text transition hover:bg-gl-hover disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
