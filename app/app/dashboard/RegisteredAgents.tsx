"use client";

import { useState, useEffect } from "react";

type Agent = { id: string; name: string; connectedAt: string };

export function RegisteredAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents", { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents ?? []);
        }
      } catch {
        setAgents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
    const interval = setInterval(fetchAgents, 3000);
    return () => clearInterval(interval);
  }, []);

  const agentCount = agents.length;

  return (
    <div className="mb-6 rounded-native border border-white/[0.06] bg-gl-card p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-medium text-white">Registered agents</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">Checking…</p>
      ) : agentCount === 0 ? (
        <p className="text-sm text-amber-400">
          No agents connected. You must register an agent before deploying.
        </p>
      ) : (
        <p className="text-sm text-primary">
          {agentCount} agent{agentCount !== 1 ? "s" : ""} connected
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-500">
        1) Run the agent gateway: <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1.5 py-0.5">npm run agent-gateway</code>
        {" "}(port 3001). 2) Run the agent: <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1.5 py-0.5">cd agent && npm start</code>.
      </p>
      {agentCount > 0 && (
        <ul className="mt-2 list-inside list-disc text-xs text-zinc-400">
          {agents.map((a) => (
            <li key={a.id}>{a.name} — connected</li>
          ))}
        </ul>
      )}
    </div>
  );
}
