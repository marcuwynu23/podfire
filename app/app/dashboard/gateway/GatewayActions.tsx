"use client";

import { useState } from "react";

export function GatewayActions() {
  const [deployState, setDeployState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [removeState, setRemoveState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleDeploy() {
    setDeployState("loading");
    setRemoveState("idle");
    setMessage(null);
    try {
      const res = await fetch("/api/traefik/deploy", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setDeployState("error");
        setMessage(data.error ?? "Deploy failed");
        return;
      }
      setDeployState("success");
      setMessage("Gateway is deploying. Refresh status in a few seconds.");
    } catch {
      setDeployState("error");
      setMessage("Request failed");
    }
  }

  async function handleRemove() {
    setRemoveState("loading");
    setDeployState("idle");
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

  return (
    <div className="rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-white">Management</h2>
      <p className="mb-4 text-sm text-zinc-400">
        Deploy or remove the Gateway on your Swarm. An agent must be connected for these actions to run.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleDeploy}
          disabled={deployState === "loading"}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {deployState === "loading" ? "Deploying…" : "Deploy Gateway"}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={removeState === "loading"}
          className="rounded-native-sm border border-white/[0.06] bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.06] disabled:opacity-50"
        >
          {removeState === "loading" ? "Removing…" : "Remove Gateway"}
        </button>
      </div>
      {(message || deployState === "error" || removeState === "error") && (
        <p className={`mt-3 text-sm ${deployState === "error" || removeState === "error" ? "text-amber-400" : "text-zinc-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
