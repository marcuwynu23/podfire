import { AppLogsViewer } from "../logs/AppLogsViewer";

export function LogsTab({ serviceId }: { serviceId: string }) {
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold text-white">Application logs</h2>
      <p className="mt-0.5 text-sm text-zinc-400">
        Live stdout/stderr from the running container. Build logs are in the
        Deployments tab.
      </p>
      <div className="mt-4 rounded-native-sm border border-white/[0.06] bg-black/10 p-4">
        <AppLogsViewer serviceId={serviceId} live />
      </div>
    </div>
  );
}
