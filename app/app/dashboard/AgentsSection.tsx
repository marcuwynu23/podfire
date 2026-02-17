"use client";

import { useState, useEffect, useCallback } from "react";

type RegisteredAgent = { id: string; name: string; createdAt: string };
type ConnectedAgent = { id: string; name: string; connectedAt: string };

export function AgentsSection() {
  const [registered, setRegistered] = useState<RegisteredAgent[]>([]);
  const [connected, setConnected] = useState<ConnectedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [instructionsId, setInstructionsId] = useState<string | null>(null);

  const fetchRegistered = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/registered", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setRegistered(data.agents ?? []);
      }
    } catch {
      setRegistered([]);
    }
  }, []);

  const fetchConnected = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { credentials: "same-origin" });
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
      await Promise.all([fetchRegistered(), fetchConnected()]);
      setLoading(false);
    };
    load();
    const t = setInterval(() => {
      fetchRegistered();
      fetchConnected();
    }, 3000);
    return () => clearInterval(t);
  }, [fetchRegistered, fetchConnected]);

  const isConnected = (name: string) =>
    connected.some((c) => c.name.toLowerCase() === name.toLowerCase());

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    const name = addName.trim();
    if (!name) {
      setAddError("Name is required.");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/agents/registered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add agent");
      setAddName("");
      setModalOpen(false);
      await fetchRegistered();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add agent");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this agent?")) return;
    try {
      await fetch(`/api/agents/registered/${id}`, { method: "DELETE" });
      await fetchRegistered();
    } catch {
      // ignore
    }
  }

  return (
    <div className="mb-8 rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Agents</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover"
        >
          Add agent
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : registered.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No agents yet. Add an agent and run it with the same name to connect.
        </p>
      ) : (
        <ul className="space-y-3">
          {registered.map((a) => {
            const connected_ = isConnected(a.name);
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-native-sm border border-white/[0.06] bg-black/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">{a.name}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      connected_
                        ? "bg-primary/15 text-primary"
                        : "bg-zinc-600/50 text-zinc-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        connected_ ? "bg-primary" : "bg-zinc-500"
                      }`}
                    />
                    {connected_ ? "Connected" : "Offline"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setInstructionsId(instructionsId === a.id ? null : a.id)
                    }
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    {instructionsId === a.id ? "Hide" : "Run instructions"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="text-xs text-zinc-400 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
                {instructionsId === a.id && (
                  <div className="mt-2 w-full border-t border-white/[0.06] pt-3">
                    <p className="mb-2 text-xs text-zinc-500">
                      In the agent folder, run:
                    </p>
                    <pre className="overflow-x-auto rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-zinc-300">
                      AGENT_NAME={a.name} npm start
                    </pre>
                    <p className="mt-2 text-xs text-zinc-500">
                      Ensure the gateway is running (e.g. <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">npm run agent-gateway</code> in the app folder).
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-agent-title"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-native border border-white/[0.06] bg-gl-card shadow-sm">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <h2 id="add-agent-title" className="text-lg font-semibold text-white">
                Add agent
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              {addError && (
                <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {addError}
                </p>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Agent name
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. my-agent"
                  className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Use this name when starting the agent: <code className="rounded-native-sm border border-white/[0.06] bg-black/20 px-1">AGENT_NAME={addName || "…"} npm start</code>
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-native-sm border border-white/[0.06] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
                >
                  {addLoading ? "Adding…" : "Add agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
