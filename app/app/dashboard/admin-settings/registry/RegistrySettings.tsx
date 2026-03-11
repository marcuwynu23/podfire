"use client";

import { useState, useEffect } from "react";

type SettingsStatus = Record<string, { set: boolean }>;

function EyeButton({
  show,
  onClick,
}: {
  show: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gl-text-muted hover:text-gl-text focus:outline-none"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

export function RegistrySettings() {
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [defaultRegistry, setDefaultRegistry] = useState<"docker" | "harbor">(
    "docker"
  );
  const [dockerRegistry, setDockerRegistry] = useState("");
  const [dockerUsername, setDockerUsername] = useState("");
  const [dockerPassword, setDockerPassword] = useState("");
  const [showDockerPassword, setShowDockerPassword] = useState(false);
  const [harborRegistry, setHarborRegistry] = useState("");
  const [harborUsername, setHarborUsername] = useState("");
  const [harborPassword, setHarborPassword] = useState("");
  const [showHarborPassword, setShowHarborPassword] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setStatus(data.settings);
        if (data.values) setValues(data.values);
        const dr = data.values?.default_registry?.toLowerCase();
        if (dr === "harbor" || dr === "docker") setDefaultRegistry(dr);
      })
      .catch(() => setStatus({}))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, string> = {
      default_registry: defaultRegistry,
    };
    if (dockerRegistry.trim()) body.docker_registry = dockerRegistry.trim();
    if (dockerUsername.trim())
      body.docker_registry_username = dockerUsername.trim();
    if (dockerPassword.trim())
      body.docker_registry_password = dockerPassword.trim();
    if (harborRegistry.trim()) body.harbor_registry = harborRegistry.trim();
    if (harborUsername.trim())
      body.harbor_registry_username = harborUsername.trim();
    if (harborPassword.trim())
      body.harbor_registry_password = harborPassword.trim();

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMessage({ type: "ok", text: "Registry settings saved." });
      setDockerPassword("");
      setHarborPassword("");
      fetch("/api/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) setStatus(d.settings);
          if (d.values) setValues(d.values);
          const dr = d.values?.default_registry?.toLowerCase();
          if (dr === "harbor" || dr === "docker") setDefaultRegistry(dr);
        });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gl-text-muted">Loading…</p>;
  }

  const set = (key: string) => status?.[key]?.set ?? false;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <p
          className={`rounded-native-sm border px-4 py-2 text-sm ${
            message.type === "ok"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <section className="rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gl-text">Default registry</h2>
        <p className="mt-1 text-sm text-gl-text-muted">
          Choose which registry to use by default when pushing images.
        </p>
        <div className="mt-4 flex gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="default_registry"
              checked={defaultRegistry === "docker"}
              onChange={() => setDefaultRegistry("docker")}
              className="text-primary focus:ring-primary"
            />
            <span className="text-sm text-gl-text">Docker</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="default_registry"
              checked={defaultRegistry === "harbor"}
              onChange={() => setDefaultRegistry("harbor")}
              className="text-primary focus:ring-primary"
            />
            <span className="text-sm text-gl-text">Harbor</span>
          </label>
        </div>
      </section>

      <section className="rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gl-text">Docker registry</h2>
        <p className="mt-1 text-sm text-gl-text-muted">
          Registry host for pushing images (e.g. registry.example.com). Leave
          empty for local-only.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              Registry URL
            </label>
            <input
              type="text"
              value={dockerRegistry}
              onChange={(e) => setDockerRegistry(e.target.value)}
              placeholder={
                set("docker_registry") ? "Currently set" : "e.g. registry.local"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              Registry username (optional)
            </label>
            <input
              type="text"
              value={dockerUsername}
              onChange={(e) => setDockerUsername(e.target.value)}
              placeholder={
                set("docker_registry_username") ? "••••••••" : "Username"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              Registry password (optional)
            </label>
            <input
              type={showDockerPassword ? "text" : "password"}
              value={dockerPassword}
              onChange={(e) => setDockerPassword(e.target.value)}
              placeholder={
                set("docker_registry_password")
                  ? "•••••••• (leave blank to keep)"
                  : "Password"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 pr-10 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <EyeButton
              show={showDockerPassword}
              onClick={() => setShowDockerPassword((v) => !v)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gl-text">Harbor registry</h2>
        <p className="mt-1 text-sm text-gl-text-muted">
          Harbor registry host (e.g. harbor.example.com). Leave empty to not use
          Harbor.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              Registry URL
            </label>
            <input
              type="text"
              value={harborRegistry}
              onChange={(e) => setHarborRegistry(e.target.value)}
              placeholder={
                set("harbor_registry") ? "Currently set" : "e.g. harbor.local"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              Registry username (optional)
            </label>
            <input
              type="text"
              value={harborUsername}
              onChange={(e) => setHarborUsername(e.target.value)}
              placeholder={
                set("harbor_registry_username") ? "••••••••" : "Username"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              Registry password (optional)
            </label>
            <input
              type={showHarborPassword ? "text" : "password"}
              value={harborPassword}
              onChange={(e) => setHarborPassword(e.target.value)}
              placeholder={
                set("harbor_registry_password")
                  ? "•••••••• (leave blank to keep)"
                  : "Password"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 pr-10 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <EyeButton
              show={showHarborPassword}
              onClick={() => setShowHarborPassword((v) => !v)}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
