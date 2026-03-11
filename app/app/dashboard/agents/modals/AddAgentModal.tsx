"use client";

import { useState } from "react";

type AddAgentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: () => void;
};

export function AddAgentModal({
  isOpen,
  onClose,
  onAdded,
}: AddAgentModalProps) {
  const [addKey, setAddKey] = useState("");
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
        headers: { "Content-Type": "application/json" },
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
      onAdded?.();
      setTimeout(() => {
        onClose();
        setAddSuccess(false);
      }, 1500);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add agent");
    } finally {
      setAddLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-agent-title"
    >
      <div
        className="absolute inset-0 bg-gl-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-native border border-gl-edge bg-gl-card shadow-sm">
        <div className="flex items-center justify-between border-b border-gl-edge px-6 py-4">
          <h2 id="add-agent-title" className="text-lg font-semibold text-gl-text">
            Add Agent
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gl-text-muted hover:bg-gl-hover hover:text-gl-text"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {addError && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{addError}</p>
          )}
          {addSuccess && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              Agent added. Start (or restart) the agent to connect.
            </p>
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
              onClick={onClose}
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
  );
}
