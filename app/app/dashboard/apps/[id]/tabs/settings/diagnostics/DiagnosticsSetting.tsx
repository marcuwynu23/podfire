"use client";

import { useState, useEffect } from "react";

export function DiagnosticsSetting({
  serviceId,
  diagnosticsEnabled,
  onSaved,
}: {
  serviceId: string;
  diagnosticsEnabled: boolean;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(diagnosticsEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(diagnosticsEnabled);
  }, [diagnosticsEnabled]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosticsEnabled: enabled }),
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
      <h3 className="text-sm font-medium text-gl-text">Diagnostics tab</h3>
      <p className="mt-0.5 text-xs text-gl-text-muted">
        Show or hide the Diagnostics tab for this app. When enabled, you can run
        service diagnostics (Traefik routing, container reachability). Disabled by default.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gl-edge text-primary focus:ring-primary/30"
          />
          <span className="text-sm text-gl-text">Enable Diagnostics tab</span>
        </label>
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
