"use client";

import { useState, useEffect } from "react";
import { DeleteAppButton } from "../../components/DeleteAppButton";

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
    <section className="mt-6 rounded-native border border-gl-edge bg-gl-input-bg p-4">
      <h3 className="text-sm font-medium text-gl-text">Deploy mode</h3>
      <p className="mt-0.5 text-xs text-gl-text-muted">
        Manual: deploy only when you click Deploy. Auto: watch the app branch
        and deploy when there are new commits (call the auto-deploy cron
        periodically).
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "manual" | "auto")}
          className="rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm text-gl-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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

function DomainBlock({
  serviceId,
  currentDomain,
  onSaved,
}: {
  serviceId: string;
  currentDomain: string | null;
  onSaved: () => void;
}) {
  const [domains, setDomains] = useState<string[]>([]);
  const [selected, setSelected] = useState(currentDomain ?? "");
  const [saving, setSaving] = useState(false);
  const [updatingRouting, setUpdatingRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data.values?.dns_domains) {
          setDomains([]);
          return;
        }
        try {
          const parsed = JSON.parse(data.values.dns_domains) as unknown;
          if (!Array.isArray(parsed) || parsed.length === 0) {
            setDomains([]);
            return;
          }
          const list = parsed
            .map((item: unknown) => {
              if (item && typeof item === "object" && "domain" in item && typeof (item as { domain: string }).domain === "string")
                return (item as { domain: string }).domain.trim();
              if (typeof item === "string") return item.trim();
              return "";
            })
            .filter(Boolean);
          setDomains(list);
        } catch {
          setDomains([]);
        }
      })
      .catch(() => setDomains([]));
  }, []);

  useEffect(() => {
    setSelected(currentDomain ?? "");
  }, [currentDomain]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selected.trim() || null }),
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

  async function updateRouting() {
    setError(null);
    setUpdatingRouting(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/update-routing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Update routing failed");
        return;
      }
      onSaved();
    } catch {
      setError("Request failed");
    } finally {
      setUpdatingRouting(false);
    }
  }

  return (
    <section className="mt-6 rounded-native border border-gl-edge bg-gl-input-bg p-4">
      <h3 className="text-sm font-medium text-gl-text">Domain</h3>
      <p className="mt-0.5 text-xs text-gl-text-muted">
        App host: &lt;name&gt;.localhost or &lt;name&gt;.&lt;domain&gt; when a domain is set. Domains come from Admin → DNS.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm text-gl-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[12rem]"
        >
          <option value="">Default (&lt;name&gt;.localhost)</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
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
      {selected.trim() && (
        <p className="mt-3 text-xs text-gl-text-muted">
          After saving a custom domain, click <strong>Update routing</strong> so Traefik uses it (fixes 404 without a full redeploy).
        </p>
      )}
      {selected.trim() && (
        <button
          type="button"
          onClick={updateRouting}
          disabled={updatingRouting}
          className="mt-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/20 disabled:opacity-50"
        >
          {updatingRouting ? "Updating…" : "Update routing"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
    </section>
  );
}

function BuildBlock({
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
    <section className="mt-6 rounded-native border border-gl-edge bg-gl-input-bg p-4">
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

export function SettingsPanel({
  serviceId,
  appName,
  deployMode,
  domain,
  entryCommand,
  buildCommand,
  onSaved,
}: {
  serviceId: string;
  appName: string;
  deployMode: string;
  domain?: string | null;
  entryCommand?: string | null;
  buildCommand?: string | null;
  onSaved: () => void;
}) {
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold text-gl-text">Settings</h2>
      <p className="mt-0.5 text-sm text-gl-text-muted">
        Domain, deploy mode, build options, and danger zone.
      </p>

      <DomainBlock
        serviceId={serviceId}
        currentDomain={domain ?? null}
        onSaved={onSaved}
      />

      <DeployModeBlock
        serviceId={serviceId}
        deployMode={deployMode}
        onSaved={onSaved}
      />

      <BuildBlock
        serviceId={serviceId}
        entryCommand={entryCommand ?? null}
        buildCommand={buildCommand ?? null}
        onSaved={onSaved}
      />

      <section className="mt-6 rounded-native border border-red-500/20 bg-red-500/5">
        <div className="border-b border-red-500/20 px-4 py-3">
          <h3 className="text-sm font-semibold text-gl-text">Danger zone</h3>
          <p className="mt-0.5 text-xs text-gl-text-muted">
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
