"use client";

import { useState, useRef } from "react";

type EnvEntry = { key: string; value: string };

function parseEnvFile(text: string): EnvEntry[] {
  const result: EnvEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) result.push({ key, value });
  }
  return result;
}

function parseEnv(raw: string | null | undefined): EnvEntry[] {
  if (!raw) return [{ key: "", value: "" }];
  try {
    const obj = JSON.parse(raw) as Record<string, string>;
    const entries = Object.entries(obj).map(([k, v]) => ({ key: k, value: v }));
    return [...entries, { key: "", value: "" }];
  } catch {
    return [{ key: "", value: "" }];
  }
}

function buildEnvObject(entries: EnvEntry[]): Record<string, string> | null {
  const obj: Record<string, string> = {};
  for (const e of entries) {
    const k = e.key.trim();
    if (k) obj[k] = e.value.trim();
  }
  return Object.keys(obj).length ? obj : null;
}

export function EnvSetting({
  serviceId,
  currentEnv,
  onSaved,
}: {
  serviceId: string;
  currentEnv: string | null;
  onSaved: () => void;
}) {
  const [entries, setEntries] = useState<EnvEntry[]>(() => parseEnv(currentEnv));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const envFileInputRef = useRef<HTMLInputElement>(null);

  function handleEnvFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseEnvFile(text);
      setEntries(parsed.length ? [...parsed, { key: "", value: "" }] : [{ key: "", value: "" }]);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function addRow() {
    setEntries((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeRow(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: "key" | "value", val: string) {
    setEntries((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      return next;
    });
  }

  async function save(withRedeploy: boolean) {
    setError(null);
    setSaving(true);
    try {
      const env = buildEnvObject(entries);
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ env }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to save");
        return;
      }
      onSaved();

      if (withRedeploy) {
        const deployRes = await fetch("/api/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId }),
        });
        if (!deployRes.ok) {
          setError("Env saved but deploy failed to trigger");
        }
      }
    } catch {
      setError("Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-3 rounded-native border border-gl-edge bg-gl-input-bg p-4">
      <h3 className="text-sm font-medium text-gl-text">Environment Variables</h3>
      <p className="mt-0.5 text-xs text-gl-text-muted">
        Set in the container at runtime. Changes apply on redeploy.
      </p>
      <div className="mt-3 space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={e.key}
              onChange={(ev) => updateRow(i, "key", ev.target.value)}
              placeholder="KEY"
              className="w-32 rounded-lg border border-gl-edge bg-gl-card px-3 py-2 text-sm text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="text"
              value={e.value}
              onChange={(ev) => updateRow(i, "value", ev.target.value)}
              placeholder="value"
              className="flex-1 rounded-lg border border-gl-edge bg-gl-card px-3 py-2 text-sm text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="rounded p-2 text-gl-text-muted hover:bg-gl-hover hover:text-gl-text"
              aria-label="Remove row"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <input
            ref={envFileInputRef}
            type="file"
            accept=".env,.env.*,text/plain"
            onChange={handleEnvFileUpload}
            className="hidden"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => envFileInputRef.current?.click()}
            className="text-xs text-primary hover:text-primary/80"
          >
            + Import .env
          </button>
          <span className="text-gl-text-muted text-xs" aria-hidden>·</span>
          <button
            type="button"
            onClick={addRow}
            className="text-xs text-primary hover:text-primary/80"
          >
            + Add Variable
          </button>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          disabled={saving}
          className="rounded-xl border border-gl-edge bg-gl-input-bg px-4 py-2 text-sm font-medium text-gl-text-muted transition hover:bg-gl-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save & Redeploy"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
    </section>
  );
}
