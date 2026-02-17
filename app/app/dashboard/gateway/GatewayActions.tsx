"use client";

import { useState, useEffect } from "react";

export function GatewayActions() {
  const [yaml, setYaml] = useState("");
  const [yamlLoadState, setYamlLoadState] = useState<"idle" | "loading" | "loaded" | "error">("loading");
  const [updateState, setUpdateState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [restartState, setRestartState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [removeState, setRemoveState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setYamlLoadState("loading");
    fetch("/api/traefik/config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { yaml?: string; error?: string }) => {
        if (cancelled) return;
        if (data.yaml != null) {
          setYaml(typeof data.yaml === "string" ? data.yaml : "");
          setYamlLoadState("loaded");
        } else {
          setYaml("");
          setYamlLoadState("error");
        }
      })
      .catch(() => {
        if (!cancelled) setYamlLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function deployWithYaml(yamlToDeploy: string) {
    const res = await fetch("/api/traefik/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yaml: yamlToDeploy }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Deploy failed");
  }

  async function handleUpdate() {
    if (!yaml.trim()) {
      setMessage("Configuration is empty.");
      return;
    }
    setUpdateState("loading");
    setRestartState("idle");
    setRemoveState("idle");
    setMessage(null);
    try {
      await deployWithYaml(yaml);
      setUpdateState("success");
      setMessage("Configuration updated. Gateway is deploying.");
    } catch (err) {
      setUpdateState("error");
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleRestart() {
    if (!yaml.trim()) {
      setMessage("Configuration is empty. Load or paste YAML first.");
      return;
    }
    setRestartState("loading");
    setUpdateState("idle");
    setRemoveState("idle");
    setMessage(null);
    try {
      const removeRes = await fetch("/api/traefik/remove", { method: "POST" });
      const removeData = (await removeRes.json()) as { error?: string };
      if (!removeRes.ok) {
        setRestartState("error");
        setMessage(removeData.error ?? "Remove failed");
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
      await deployWithYaml(yaml);
      setRestartState("success");
      setMessage("Gateway restarted with current configuration.");
    } catch (err) {
      setRestartState("error");
      setMessage(err instanceof Error ? err.message : "Restart failed");
    }
  }

  async function handleRemove() {
    setRemoveState("loading");
    setUpdateState("idle");
    setRestartState("idle");
    setMessage(null);
    try {
      const res = await fetch("/api/traefik/remove", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setRemoveState("error");
        setMessage(data.error ?? "Remove failed");
        return;
      }
      setRemoveState("success");
      setMessage("Gateway stack removed.");
    } catch {
      setRemoveState("error");
      setMessage("Request failed");
    }
  }

  const hasError = updateState === "error" || restartState === "error" || removeState === "error";

  return (
    <div className="space-y-6">
      <div className="rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium text-white">Configuration</h2>
        <p className="mb-4 text-sm text-zinc-400">
          View and edit the Gateway (Traefik) stack YAML. Update to apply changes, or Restart to remove and redeploy with this config.
        </p>
        {yamlLoadState === "loading" && (
          <p className="text-sm text-zinc-500">Loading configuration…</p>
        )}
        {yamlLoadState === "error" && (
          <p className="text-sm text-amber-400">Could not load default config. You can paste YAML below.</p>
        )}
        {(yamlLoadState === "loaded" || yamlLoadState === "error") && (
          <>
            <textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              placeholder="# Paste or edit Traefik stack YAML..."
              rows={18}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              spellCheck={false}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={updateState === "loading" || restartState === "loading" || removeState === "loading"}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
              >
                {updateState === "loading" ? "Updating…" : "Update configuration"}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                disabled={updateState === "loading" || restartState === "loading" || removeState === "loading"}
                className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.1] disabled:opacity-50"
              >
                {restartState === "loading" ? "Restarting…" : "Restart Gateway"}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={updateState === "loading" || restartState === "loading" || removeState === "loading"}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {removeState === "loading" ? "Removing…" : "Remove Gateway"}
              </button>
            </div>
            {(message || hasError) && (
              <p className={`mt-3 text-sm ${hasError ? "text-amber-400" : "text-zinc-400"}`}>
                {message}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
