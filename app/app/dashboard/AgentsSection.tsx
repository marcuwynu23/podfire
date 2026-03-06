"use client";

import {useState, useEffect, useCallback} from "react";

type ConnectedAgent = {id: string; name: string; connectedAt: string};

export function AgentsSection() {
  const [connected, setConnected] = useState<ConnectedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addKey, setAddKey] = useState("");
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  const fetchConnected = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", {credentials: "same-origin"});
      if (res.ok) {
        const data = await res.json();
        setConnected(data.agents ?? []);
      }
    } catch {
      setConnected([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchConnected();
      setLoading(false);
    };
    load();
    const t = setInterval(fetchConnected, 3000);
    return () => clearInterval(t);
  }, [fetchConnected]);

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

  async function handleRemove(agentId: string) {
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
      if (!res.ok) throw new Error(data.error ?? "Failed to remove agent");
      await fetchConnected();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove agent");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mb-8 rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Agents</h2>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover"
        >
          Add Agent
        </button>
      </div>
      <p className="mb-4 text-sm text-zinc-400">
        Run the agent (
        <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">
          cd agent &amp;&amp; npm start
        </code>
        ). It will print a key — copy it and add the agent above.
      </p>

      {removeError && (
        <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{removeError}</p>
      )}
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : connected.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No agents connected. Run the agent, copy the key it prints, then use Add Agent to confirm the key.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-native-sm border border-white/[0.06]">
          <table className="w-full min-w-[320px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-black/20">
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {connected.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Connected
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(a.id)}
                      disabled={removingId === a.id}
                      className="rounded-native-sm border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {removingId === a.id ? "Removing…" : "Remove"}
                    </button>
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
            className="absolute inset-0 bg-black/60"
            onClick={() => setAddModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-native border border-white/[0.06] bg-gl-card shadow-sm">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <h2 id="add-agent-title" className="text-lg font-semibold text-white">
                Add Agent
              </h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
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
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Agent key <span className="text-zinc-500">(from agent console)</span>
                </label>
                <input
                  type="text"
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  placeholder="Paste the key the agent printed"
                  className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 font-mono text-sm text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Agent name <span className="text-zinc-500">(optional, shown when connected)</span>
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. my-agent (leave empty to use agent default)"
                  className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-native-sm border border-white/[0.06] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.06]"
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
