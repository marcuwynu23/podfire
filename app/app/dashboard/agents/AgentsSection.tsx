"use client";

import {useState, useEffect, useCallback} from "react";

type AgentRow = {
  keyId: string;
  agentId: string | null;
  name: string;
  status: "online" | "offline" | "degraded";
  connectedAt: string | null;
  lastSeenAt: string | null;
};

export function AgentsSection() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addKey, setAddKey] = useState("");
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", {credentials: "same-origin"});
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

  async function handleAddAgent(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddSuccess(false);
    const key = addKey.trim();
    if (!key) {
      setAddError("Paste the agent key (from the agent console).");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/agents/confirm-key", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          secret: key,
          name: addName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add agent");
      setAddSuccess(true);
      setAddKey("");
      setAddName("");
      setTimeout(() => {
        setAddModalOpen(false);
        setAddSuccess(false);
      }, 1500);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add agent");
    } finally {
      setAddLoading(false);
    }
  }

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

      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-agent-title"
        >
          <div
            className="absolute inset-0 bg-gl-overlay"
            onClick={() => setAddModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-native border border-gl-edge bg-gl-card shadow-sm">
            <div className="flex items-center justify-between border-b border-gl-edge px-6 py-4">
              <h2 id="add-agent-title" className="text-lg font-semibold text-gl-text">
                Add Agent
              </h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded p-1 text-gl-text-muted hover:bg-gl-hover hover:text-gl-text"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddAgent} className="p-6 space-y-4">
              {addError && (
                <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{addError}</p>
              )}
              {addSuccess && (
                <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Agent added. Start (or restart) the agent to connect.</p>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gl-text-muted">
                  Agent key <span className="text-gl-text-muted">(from agent console)</span>
                </label>
                <input
                  type="text"
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  placeholder="Paste the key the agent printed"
                  className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 font-mono text-sm text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gl-text-muted">
                  Agent name <span className="text-gl-text-muted">(optional, shown when connected)</span>
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. my-agent (leave empty to use agent default)"
                  className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-native-sm border border-gl-edge px-4 py-2 text-sm text-gl-text-muted hover:bg-gl-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
                >
                  {addLoading ? "Adding…" : "Add Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
