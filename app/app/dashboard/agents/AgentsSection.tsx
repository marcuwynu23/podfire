"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentRow } from "./types";
import { AddAgentModal } from "./modals/AddAgentModal";

export function AgentsSection() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents ?? []);
      }
    } catch {
      setAgents([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchAgents();
      setLoading(false);
    };
    load();
    const t = setInterval(fetchAgents, 5000);
    return () => clearInterval(t);
  }, [fetchAgents]);

  async function handleDisconnect(agentId: string) {
    setRemovingId(agentId);
    setRemoveError("");
    try {
      const res = await fetch("/api/agents/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to disconnect agent");
      await fetchAgents();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove agent");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mb-8 rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gl-text">Agents</h2>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover"
        >
          Add Agent
        </button>
      </div>
      <p className="mb-4 text-sm text-gl-text-muted">
        Run the agent (
        <code className="rounded-native-sm border border-gl-edge bg-gl-input-bg px-1">
          cd agent &amp;&amp; npm start
        </code>
        ). It will print a key — copy it and add the agent above.
      </p>

      {removeError && (
        <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{removeError}</p>
      )}
      {loading ? (
        <p className="text-sm text-gl-text-muted">Loading…</p>
      ) : agents.length === 0 ? (
        <p className="text-sm text-gl-text-muted">
          No agents added. Run the agent, copy the key it prints, then use Add Agent to confirm the key.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-native-sm border border-gl-edge">
          <table className="w-full min-w-[320px] border-collapse">
            <thead>
              <tr className="border-b border-gl-edge bg-gl-input-bg">
                <th className="px-4 py-3 text-left text-sm font-medium text-gl-text-muted">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gl-text-muted">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gl-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr
                  key={a.keyId}
                  className="border-b border-gl-edge last:border-b-0 hover:bg-gl-hover"
                >
                  <td className="px-4 py-3 font-medium text-gl-text">{a.name}</td>
                  <td className="px-4 py-3">
                    {a.status === "online" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                        Online
                      </span>
                    ) : a.status === "degraded" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
                        No heartbeat
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gl-edge px-2.5 py-0.5 text-xs font-medium text-gl-text-muted" title={a.lastSeenAt ?? undefined}>
                        <span className="h-1.5 w-1.5 rounded-full bg-gl-text-muted" aria-hidden />
                        Offline{a.lastSeenAt ? ` · last seen ${new Date(a.lastSeenAt).toLocaleString()}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.agentId ? (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(a.agentId!)}
                        disabled={removingId === a.agentId}
                        className="rounded-native-sm border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {removingId === a.agentId ? "Disconnecting…" : "Disconnect"}
                      </button>
                    ) : (
                      <span className="text-xs text-gl-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddAgentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdded={fetchAgents}
      />
    </div>
  );
}
