"use client";

import { useState, useEffect } from "react";

export function BuildSetting({
  serviceId,
  entryCommand,
  buildCommand,
  onSaved,
}: {
  serviceId: string;
  entryCommand: string | null;
  buildCommand: string | null;
  onSaved: () => void;
}) {
  const [entry, setEntry] = useState(entryCommand ?? "");
  const [build, setBuild] = useState(buildCommand ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntry(entryCommand ?? "");
    setBuild(buildCommand ?? "");
  }, [entryCommand, buildCommand]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryCommand: entry.trim() || null,
          buildCommand: build.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to save");
        return;
      }
      onSaved();
    } catch {
      setError("Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-3 rounded-native border border-gl-edge bg-gl-input-bg p-4">
      <h3 className="text-sm font-medium text-gl-text">Build configuration</h3>
      <p className="mt-0.5 text-xs text-gl-text-muted">
        Entry and build commands (same as when creating the app). Changes apply on next deploy.
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gl-text-muted">Entry command</label>
          <input
            type="text"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="e.g. npm start"
            className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gl-text-muted">Build command</label>
          <input
            type="text"
            value={build}
            onChange={(e) => setBuild(e.target.value)}
            placeholder="e.g. npm run build"
            className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
    </section>
  );
}
