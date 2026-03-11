"use client";

import {useState, useEffect} from "react";
import {YamlEditor} from "./YamlEditor";

type ConfirmAction = "update" | "restart" | "remove" | null;

const CONFIRM_MESSAGES: Record<
  Exclude<ConfirmAction, null>,
  {title: string; body: string}
> = {
  update: {
    title: "Save & Start Gateway",
    body: "Apply this configuration and start the gateway? Your apps will be reachable once the stack is up.",
  },
  restart: {
    title: "Restart Gateway",
    body: "Remove the current gateway stack and redeploy with the configuration above. There may be a short period when apps are unreachable.",
  },
  remove: {
    title: "Stop Gateway",
    body: "Stop the gateway? All apps will be unreachable until you start it again.",
  },
};

export function GatewayActions() {
  const [yaml, setYaml] = useState("");
  const [yamlLoadState, setYamlLoadState] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("loading");
  const [updateState, setUpdateState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [restartState, setRestartState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [removeState, setRemoveState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    if (!confirmAction) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmAction(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmAction]);

  useEffect(() => {
    let cancelled = false;
    setYamlLoadState("loading");
    fetch("/api/traefik/config", {cache: "no-store"})
      .then((res) => res.json())
      .then((data: {yaml?: string; error?: string}) => {
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
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({yaml: yamlToDeploy}),
    });
    const data = (await res.json()) as {error?: string};
    if (!res.ok) throw new Error(data.error ?? "Deploy failed");
  }

  async function handleUpdate() {
    if (!yaml.trim()) {
      setMessage("Configuration is empty.");
      return;
    }
    setConfirmAction("update");
  }

  async function runUpdate() {
    setConfirmAction(null);
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
    setConfirmAction("restart");
  }

  async function runRestart() {
    setConfirmAction(null);
    setRestartState("loading");
    setUpdateState("idle");
    setRemoveState("idle");
    setMessage(null);
    try {
      const removeRes = await fetch("/api/traefik/remove", {method: "POST"});
      const removeData = (await removeRes.json()) as {error?: string};
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

  function handleRemove() {
    setConfirmAction("remove");
  }

  async function runRemove() {
    setConfirmAction(null);
    setRemoveState("loading");
    setUpdateState("idle");
    setRestartState("idle");
    setMessage(null);
    try {
      const res = await fetch("/api/traefik/remove", {method: "POST"});
      const data = (await res.json()) as {error?: string};
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

  const hasError =
    updateState === "error" ||
    restartState === "error" ||
    removeState === "error";

  function onConfirm() {
    if (confirmAction === "update") runUpdate();
    else if (confirmAction === "restart") runRestart();
    else if (confirmAction === "remove") runRemove();
  }

  return (
    <div className="min-w-0 space-y-6">
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gl-overlay p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-gl-edge bg-gl-card p-4 shadow-lg sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-title" className="text-lg font-medium text-gl-text">
              {CONFIRM_MESSAGES[confirmAction].title}
            </h3>
            <p className="mt-2 text-sm text-gl-text-muted">
              {CONFIRM_MESSAGES[confirmAction].body}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-xl border border-gl-edge bg-gl-input-bg px-4 py-2 text-sm font-medium text-gl-text transition hover:bg-gl-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={
                  confirmAction === "remove"
                    ? "btn-danger rounded-xl border px-4 py-2 text-sm font-medium transition"
                    : "rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover"
                }
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        id="gateway-config"
        className="w-full overflow-hidden rounded-native border border-gl-edge bg-gl-card p-4 shadow-sm sm:p-6"
      >
        <h2 className="mb-2 text-lg font-medium text-gl-text">Configuration</h2>
        <p className="mb-4 text-sm text-gl-text-muted">
          View and edit the Gateway (Traefik) stack YAML. Update to apply
          changes, or Restart to remove and redeploy with this config.
        </p>
        {yamlLoadState === "loading" && (
          <p className="text-sm text-gl-text-muted">Loading configuration…</p>
        )}
        {yamlLoadState === "error" && (
          <p className="text-sm text-amber-400">
            Could not load default config. You can paste YAML below.
          </p>
        )}
        {(yamlLoadState === "loaded" || yamlLoadState === "error") && (
          <>
            <div className="mt-2 w-full min-w-0 max-w-full overflow-hidden">
              <YamlEditor
                value={yaml}
                onChange={setYaml}
                placeholder="# Paste or edit Traefik stack YAML..."
                aria-label="Traefik stack YAML"
              />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={
                  updateState === "loading" ||
                  restartState === "loading" ||
                  removeState === "loading"
                }
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50 sm:w-auto sm:py-2"
              >
                {updateState === "loading"
                  ? "Updating…"
                  : "Save & Start Gateway"}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                disabled={
                  updateState === "loading" ||
                  restartState === "loading" ||
                  removeState === "loading"
                }
                className="w-full rounded-xl border border-gl-edge bg-gl-input-bg px-4 py-2.5 text-sm font-medium text-gl-text transition hover:bg-gl-hover disabled:opacity-50 sm:w-auto sm:py-2"
              >
                {restartState === "loading" ? "Restarting…" : "Restart Gateway"}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={
                  updateState === "loading" ||
                  restartState === "loading" ||
                  removeState === "loading"
                }
                className="btn-danger w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 sm:w-auto sm:py-2"
              >
                {removeState === "loading" ? "Stopping..." : "Stop Gateway"}
              </button>
            </div>
            {(message || hasError) && (
              <p
                className={`mt-3 text-sm ${hasError ? "text-amber-400" : "text-gl-text-muted"}`}
              >
                {message}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
