"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Repo = {
  id: number;
  full_name: string;
  clone_url: string;
  default_branch: string;
};

type Branch = { name: string };

type CreateServiceFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
  cancelHref?: string;
  showCancelLink?: boolean;
};

export function CreateServiceForm({ onSuccess, onCancel, cancelHref = "/dashboard", showCancelLink = true }: CreateServiceFormProps) {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRepos(data);
      })
      .catch(() => setRepos([]));
  }, []);

  useEffect(() => {
    if (!selectedRepo) {
      setBranches([]);
      setBranch("");
      return;
    }
    fetch(`/api/github/branches?repo=${encodeURIComponent(selectedRepo)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBranches(data);
        const repo = repos.find((r) => r.full_name === selectedRepo);
        setBranch(repo?.default_branch ?? data[0]?.name ?? "main");
      })
      .catch(() => setBranches([]));
  }, [selectedRepo, repos]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !selectedRepo) {
      setError("Name and repository are required.");
      return;
    }
    const repo = repos.find((r) => r.full_name === selectedRepo);
    if (!repo) return;
    setLoading(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          repoUrl: repo.clone_url,
          branch: branch || repo.default_branch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create service");
      onSuccess?.();
      router.push(`/dashboard/apps/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-2xl space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
    >
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Service name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-app"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          GitHub repository
        </label>
        <select
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          required
        >
          <option value="">Select a repository</option>
          {repos.map((r) => (
            <option key={r.id} value={r.full_name}>
              {r.full_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Branch
        </label>
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create service"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
        {showCancelLink && !onCancel && (
          <Link
            href={cancelHref}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
