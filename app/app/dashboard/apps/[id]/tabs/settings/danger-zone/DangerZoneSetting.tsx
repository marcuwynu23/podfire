"use client";

import { DeleteAppButton } from "../../../components/DeleteAppButton";

export function DangerZoneSetting({
  serviceId,
  appName,
}: {
  serviceId: string;
  appName: string;
}) {
  return (
    <section className="mt-3 rounded-native border border-red-500/20 bg-red-500/5">
      <div className="border-b border-red-500/20 px-4 py-3">
        <h3 className="text-sm font-semibold text-gl-text">Danger zone</h3>
        <p className="mt-0.5 text-xs text-gl-text-muted">
          Permanently remove this app and its deployments. This cannot be
          undone.
        </p>
      </div>
      <div className="p-4">
        <DeleteAppButton serviceId={serviceId} appName={appName} />
      </div>
    </section>
  );
}
