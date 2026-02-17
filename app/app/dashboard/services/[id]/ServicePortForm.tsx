"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ServicePortForm({
  serviceId,
  currentPort,
}: {
  serviceId: string;
  currentPort: number | null;
}) {
  const router = useRouter();
  const [port, setPort] = useState(String(currentPort ?? 3000));
  const [saving, setSaving] = useState(false);

  async function save() {
    const num = parseInt(port, 10);
    if (num < 1 || num > 65535) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port: num }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-2 text-lg font-medium text-white">Container port</h2>
      <p className="mb-3 text-sm text-zinc-400">
        Port your app listens on inside the container. Use <strong>80</strong> for nginx, <strong>3000</strong> for Node/Next.js. Redeploy after changing.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          max={65535}
          value={port}
          onChange={(e) => setPort(e.target.value)}
          className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => { setPort("80"); }}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Set 80 (nginx)
        </button>
        <button
          type="button"
          onClick={() => { setPort("3000"); }}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Set 3000 (Node)
        </button>
      </div>
    </div>
  );
}
