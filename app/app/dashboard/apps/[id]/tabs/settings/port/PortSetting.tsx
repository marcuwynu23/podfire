"use client";

import { useState, useEffect } from "react";

const MIN_PORT = 1;
const MAX_PORT = 65535;

export function PortSetting({
  serviceId,
  currentPort,
  onSaved,
}: {
  serviceId: string;
  currentPort: number | null;
  onSaved: () => void;
}) {
  const [port, setPort] = useState(String(currentPort ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPort(String(currentPort ?? ""));
  }, [currentPort]);

  async function saveAndUpdateRouting() {
    setError(null);
    const num = parseInt(port, 10);
    if (!port.trim() || isNaN(num) || num < MIN_PORT || num > MAX_PORT) {
      setError(`Port must be ${MIN_PORT}–${MAX_PORT}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port: num }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to save");
        return;
      }
      const routingRes = await fetch(`/api/services/${serviceId}/update-routing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });
      const routingData = await routingRes.json().catch(() => ({}));
      if (!routingRes.ok) {
        setError((routingData as { error?: string }).error ?? "Update routing failed");
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
      <h3 className="text-sm font-medium text-gl-text">Container port</h3>
      <p className="mt-0.5 text-xs text-gl-text-muted">
        The port your application listens on inside the container (e.g. 3000, 5000, 8080). Default: 80.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={MIN_PORT}
          max={MAX_PORT}
          value={port}
          onChange={(e) => {
            setPort(e.target.value);
            setError(null);
          }}
          placeholder="80"
          disabled={saving}
          className="w-24 rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={saveAndUpdateRouting}
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save & update routing"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
    </section>
  );
}
