"use client";

import { useState, useEffect } from "react";
import { DeleteAppButton } from "../components/DeleteAppButton";

function DeployModeBlock({
  serviceId,
  deployMode,
  onSaved,
}: {
  serviceId: string;
  deployMode: string;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState(deployMode === "auto" ? "auto" : "manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(deployMode === "auto" ? "auto" : "manual");
  }, [deployMode]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deployMode: mode }),
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
    <section className="mt-6 rounded-native border border-white/[0.06] bg-black/10 p-4">
      <h3 className="text-sm font-medium text-white">Deploy mode</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Manual: deploy only when you click Deploy. Auto: watch the app branch
        and deploy when there are new commits (call the auto-deploy cron
        periodically).
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "manual" | "auto")}
          className="rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="manual">Manual</option>
          <option value="auto">Auto (watch branch)</option>
        </select>
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

export function SettingsPanel({
  serviceId,
  appName,
  deployMode,
  onSaved,
}: {
  serviceId: string;
  appName: string;
  deployMode: string;
  onSaved: () => void;
}) {
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold text-white">Settings</h2>
      <p className="mt-0.5 text-sm text-zinc-400">
        Deploy mode and danger zone.
      </p>

      <DeployModeBlock
        serviceId={serviceId}
        deployMode={deployMode}
        onSaved={onSaved}
      />

      <section className="mt-6 rounded-native border border-red-500/20 bg-red-500/5">
        <div className="border-b border-red-500/20 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Danger zone</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Permanently remove this app and its deployments. This cannot be
            undone.
          </p>
        </div>
        <div className="p-4">
          <DeleteAppButton serviceId={serviceId} appName={appName} />
        </div>
      </section>
    </div>
  );
}
