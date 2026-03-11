import {AppLogsViewer} from "../../log/AppLogsViewer";

export function LogsTab({serviceId}: {serviceId: string}) {
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold text-gl-text">Application logs</h2>
      <p className="mt-0.5 text-sm text-gl-text-muted">
        Live stdout/stderr from the running container. Build logs are in the
        Deployments tab.
      </p>
      <div className="mt-4 rounded-native-sm border border-gl-edge bg-gl-input-bg p-4">
        <AppLogsViewer serviceId={serviceId} live />
      </div>
    </div>
  );
}
