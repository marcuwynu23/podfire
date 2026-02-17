"use client";

import { useState, useEffect, useRef } from "react";

type SettingsStatus = Record<string, { set: boolean }>;

export function SettingsForm() {
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [cloudflareToken, setCloudflareToken] = useState("");
  const [dockerRegistry, setDockerRegistry] = useState("");
  const [dockerUsername, setDockerUsername] = useState("");
  const [dockerPassword, setDockerPassword] = useState("");
  const [githubClientId, setGitHubClientId] = useState("");
  const [githubClientSecret, setGitHubClientSecret] = useState("");
  const certPemRef = useRef<HTMLInputElement>(null);
  const certKeyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setStatus(data.settings);
      })
      .catch(() => setStatus({}))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, string> = {};
    if (cloudflareToken.trim()) body.cloudflare_api_token = cloudflareToken.trim();
    if (dockerRegistry.trim()) body.docker_registry = dockerRegistry.trim();
    if (dockerUsername.trim()) body.docker_registry_username = dockerUsername.trim();
    if (dockerPassword.trim()) body.docker_registry_password = dockerPassword.trim();
    if (githubClientId.trim()) body.github_client_id = githubClientId.trim();
    if (githubClientSecret.trim()) body.github_client_secret = githubClientSecret.trim();

    const pemFile = certPemRef.current?.files?.[0];
    const keyFile = certKeyRef.current?.files?.[0];
    if (pemFile) {
      const text = await pemFile.text();
      body.origin_cert_pem = text;
    }
    if (keyFile) {
      const text = await keyFile.text();
      body.origin_private_key_pem = text;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMessage({ type: "ok", text: "Settings saved." });
      setCloudflareToken("");
      setDockerPassword("");
      setGitHubClientSecret("");
      certPemRef.current && (certPemRef.current.value = "");
      certKeyRef.current && (certKeyRef.current.value = "");
      fetch("/api/settings")
        .then((r) => r.json())
        .then((d) => d.settings && setStatus(d.settings));
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-500">Loading…</p>
    );
  }

  const set = (key: string) => status?.[key]?.set ?? false;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {message && (
        <p className={`rounded-native-sm border px-4 py-2 text-sm ${message.type === "ok" ? "border-primary/30 bg-primary/10 text-primary" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
          {message.text}
        </p>
      )}

      {/* Cloudflare */}
      <section className="rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white">Cloudflare</h2>
        <p className="mt-1 text-sm text-zinc-400">API token for Cloudflare integration.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Cloudflare API Token</label>
            <input
              type="password"
              value={cloudflareToken}
              onChange={(e) => setCloudflareToken(e.target.value)}
              placeholder={set("cloudflare_api_token") ? "•••••••• (leave blank to keep current)" : "Set token"}
              className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </section>

      {/* Certificates */}
      <section className="rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white">Origin certificates</h2>
        <p className="mt-1 text-sm text-zinc-400">Upload Cloudflare Origin Certificate (.pem) and private key (.key).</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Origin certificate (.pem)</label>
            <input
              ref={certPemRef}
              type="file"
              accept=".pem,.crt"
              className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-primary-hover"
            />
            {set("origin_cert_pem") && <p className="mt-1 text-xs text-zinc-500">Certificate is set. Upload a new file to replace.</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Private key (.key)</label>
            <input
              ref={certKeyRef}
              type="file"
              accept=".key,.pem"
              className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-primary-hover"
            />
            {set("origin_private_key_pem") && <p className="mt-1 text-xs text-zinc-500">Private key is set. Upload a new file to replace.</p>}
          </div>
        </div>
      </section>

      {/* Docker registry */}
      <section className="rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white">Docker registry</h2>
        <p className="mt-1 text-sm text-zinc-400">Registry host for pushing images (e.g. registry.example.com). Leave empty for local-only.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Registry URL</label>
            <input
              type="text"
              value={dockerRegistry}
              onChange={(e) => setDockerRegistry(e.target.value)}
              placeholder={set("docker_registry") ? "Currently set" : "e.g. registry.local"}
              className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Registry username (optional)</label>
            <input
              type="text"
              value={dockerUsername}
              onChange={(e) => setDockerUsername(e.target.value)}
              placeholder={set("docker_registry_username") ? "••••••••" : "Username"}
              className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Registry password (optional)</label>
            <input
              type="password"
              value={dockerPassword}
              onChange={(e) => setDockerPassword(e.target.value)}
              placeholder={set("docker_registry_password") ? "•••••••• (leave blank to keep)" : "Password"}
              className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </section>

      {/* GitHub */}
      <section className="rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white">GitHub OAuth</h2>
        <p className="mt-1 text-sm text-zinc-400">Client ID and Client Secret for GitHub login. Callback URL remains from .env (e.g. http://localhost:3000/api/github/callback).</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">GitHub Client ID</label>
            <input
              type="text"
              value={githubClientId}
              onChange={(e) => setGitHubClientId(e.target.value)}
              placeholder={set("github_client_id") ? "Currently set" : "OAuth App Client ID"}
              className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">GitHub Client Secret</label>
            <input
              type="password"
              value={githubClientSecret}
              onChange={(e) => setGitHubClientSecret(e.target.value)}
              placeholder={set("github_client_secret") ? "•••••••• (leave blank to keep current)" : "OAuth App Client Secret"}
              className="w-full rounded-native-sm border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
