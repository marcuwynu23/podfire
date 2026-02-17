"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteAppButton({
  serviceId,
  appName,
}: {
  serviceId: string;
  appName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const nameMatches = confirmName.trim() === appName;

  async function handleDelete() {
    if (!nameMatches) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete");
      }
      router.push("/dashboard/apps");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete app");
    } finally {
      setLoading(false);
      setConfirming(false);
      setConfirmName("");
    }
  }

  function handleCancel() {
    setConfirming(false);
    setConfirmName("");
  }

  if (confirming) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm text-red-200">
          To delete <strong>{appName}</strong>, type <strong>{appName}</strong> below. This will
          remove the app, its deployments, and take down the running stack. This cannot be undone.
        </p>
        <input
          type="text"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={appName}
          className="mt-3 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
          autoFocus
          disabled={loading}
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || !nameMatches}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/[0.06]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
    >
      Delete app
    </button>
  );
}
