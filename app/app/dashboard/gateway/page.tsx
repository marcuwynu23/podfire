import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GatewayStatus } from "./GatewayStatus";
import { GatewayActions } from "./GatewayActions";

async function getDeployedServices(userId: string) {
  return prisma.service.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      stackName: true,
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });
}

export default async function GatewayPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const services = await getDeployedServices(userId);

  return (
    <div className="w-full space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-white">Gateway</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Reverse proxy that routes <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">*.localhost</code> to your deployed apps. Deploy it once; then your app URLs (e.g. <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">myservice.localhost</code>) work automatically.
        </p>
      </div>

      <div className="rounded-native border border-white/[0.06] bg-gl-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-white">Setup (required for Deploy / Status)</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Use two terminals. First time: run <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1.5 py-0.5">npm install</code> in the app folder (for <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">concurrently</code>).
        </p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-zinc-300">
          <li>In the <strong>app</strong> folder: <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1.5 py-0.5">npm run dev:all</code> — runs the app and gateway (ports 3000 and 3001).</li>
          <li>In the <strong>agent</strong> folder: <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1.5 py-0.5">npm start</code> — connects the agent to the gateway.</li>
        </ol>
        <p className="mt-2 text-xs text-zinc-500">
          Or run the gateway alone: <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">npm run agent-gateway</code>. If the app runs elsewhere, set <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">AGENT_GATEWAY_URL</code> in the app&apos;s <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">.env</code>.
        </p>
      </div>

      <GatewayStatus />
      <GatewayActions />

      <div className="rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-white">Your apps</h2>
        <p className="mb-4 text-sm text-zinc-400">
          Each app is reachable at <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">{"<name>.localhost"}</code> when the Gateway is running.
        </p>
        {services.length === 0 ? (
          <p className="text-zinc-500">No apps yet. Create one from the dashboard.</p>
        ) : (
          <ul className="space-y-2">
            {services.map((s) => {
              const host = (s.stackName ?? s.name).toLowerCase().replace(/[^a-z0-9-]/g, "-");
              const latest = s.deployments[0]?.status;
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-native-sm border border-white/[0.06] bg-black/20 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-white">{s.name}</span>
                    <span className="ml-2 text-sm text-zinc-500">→ {host}.localhost</span>
                  </div>
                  <span className="text-sm text-zinc-500">{latest ?? "—"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Ensure an agent is connected so Dockly can deploy and manage the Gateway. Your apps use the same <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">web</code> network; no manual Docker commands are required.
      </p>
    </div>
  );
}
