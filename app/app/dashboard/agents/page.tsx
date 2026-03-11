import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AgentsSection } from "./AgentsSection";

export default async function AgentsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  return (
    <div className="w-full">
      <Link href="/dashboard" className="text-sm text-gl-text-muted hover:text-gl-text">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gl-text">Agents</h1>
      <p className="mt-1 mb-6 text-sm text-gl-text-muted">
        Connect one or more agents to run deploys and manage the Gateway. Each agent runs in a separate process and connects to the app via WebSocket.
      </p>
      <AgentsSection />
    </div>
  );
}
