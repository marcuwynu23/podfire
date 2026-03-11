"use client";

import {useState, useEffect, useRef} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";

type Repo = {
  id: number;
  full_name: string;
  clone_url: string;
  default_branch: string;
};

type Branch = {name: string};

type EnvEntry = {key: string; value: string};

type CreateAppFormProps = {cancelHref?: string; contained?: boolean};

export function CreateAppForm({
  cancelHref = "/dashboard",
  contained = false,
}: CreateAppFormProps) {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const repoDropdownRef = useRef<HTMLDivElement>(null);
  const envFileInputRef = useRef<HTMLInputElement>(null);
  const [branch, setBranch] = useState("");
  const [name, setName] = useState("");
  const [entryCommand, setEntryCommand] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([
    {key: "", value: ""},
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accordionOpen, setAccordionOpen] = useState({
    application: true,
    build: false,
    env: false,
  });

  function toggleAccordion(section: keyof typeof accordionOpen) {
    setAccordionOpen((prev) => ({...prev, [section]: !prev[section]}));
  }

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase().trim()),
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        repoDropdownRef.current &&
        !repoDropdownRef.current.contains(event.target as Node)
      ) {
        setRepoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  function addEnvRow() {
    setEnvEntries((prev) => [...prev, {key: "", value: ""}]);
  }

  function removeEnvRow(i: number) {
    setEnvEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateEnvRow(i: number, field: "key" | "value", val: string) {
    setEnvEntries((prev) => {
      const next = [...prev];
      next[i] = {...next[i], [field]: val};
      return next;
    });
  }

  /** Parse .env-style content into flat key/value entries. Comments and empty lines skipped. */
  function parseEnvFile(text: string): EnvEntry[] {
    const entries: EnvEntry[] = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      let key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key) entries.push({key, value});
    }
    return entries;
  }

  function handleEnvFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseEnvFile(text);
      setEnvEntries(
        parsed.length
          ? [...parsed, {key: "", value: ""}]
          : [{key: "", value: ""}],
      );
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function buildEnvObject(): Record<string, string> | null {
    const obj: Record<string, string> = {};
    for (const e of envEntries) {
      const k = e.key.trim();
      if (k) obj[k] = e.value.trim();
    }
    return Object.keys(obj).length ? obj : null;
  }

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
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          name: name.trim(),
          repoUrl: repo.clone_url,
          branch: branch || repo.default_branch,
          entryCommand: entryCommand.trim() || undefined,
          buildCommand: buildCommand.trim() || undefined,
          env: buildEnvObject() ?? undefined,
          deployMode: "manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create app");
      router.push(`/dashboard/apps/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create app");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`w-full space-y-6 ${contained ? "" : "rounded-native border border-white/[0.06] bg-gl-card p-6 shadow-sm"}`}
    >
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-1 border border-white/[0.06] rounded-native-sm overflow-hidden">
        {/* Application Information */}
        <div className="bg-black/20">
          <button
            type="button"
            onClick={() => toggleAccordion("application")}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/[0.04] transition"
            aria-expanded={accordionOpen.application}
          >
            <span>Application Information</span>
            <svg
              className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${accordionOpen.application ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {accordionOpen.application && (
            <div className="border-t border-white/[0.06] px-4 pb-4 pt-2 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  App name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-app"
                  className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              <div ref={repoDropdownRef} className="relative">
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  GitHub repository
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      repoDropdownOpen ? repoSearch : selectedRepo || repoSearch
                    }
                    onChange={(e) => {
                      setRepoSearch(e.target.value);
                      setRepoDropdownOpen(true);
                      if (!e.target.value) setSelectedRepo("");
                    }}
                    onFocus={() => {
                      setRepoDropdownOpen(true);
                      if (selectedRepo && !repoSearch)
                        setRepoSearch(selectedRepo);
                    }}
                    placeholder="Search repositories..."
                    className="w-full rounded-lg border border-white/[0.06] bg-black/20 py-2 pl-3 pr-10 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoComplete="off"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </span>
                </div>
                {repoDropdownOpen && (
                  <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-native-sm border border-white/[0.06] bg-gl-card py-1 shadow-sm">
                    {filteredRepos.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-zinc-500">
                        No repositories match
                      </li>
                    ) : (
                      filteredRepos.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRepo(r.full_name);
                              setRepoSearch("");
                              setRepoDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                          >
                            {r.full_name}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
                {selectedRepo && !repoDropdownOpen && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Selected: {selectedRepo}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Branch
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Build Configuration */}
        <div className="border-t border-white/[0.06] bg-black/20">
          <button
            type="button"
            onClick={() => toggleAccordion("build")}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/[0.04] transition"
            aria-expanded={accordionOpen.build}
          >
            <span>Build Configuration</span>
            <svg
              className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${accordionOpen.build ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {accordionOpen.build && (
            <div className="border-t border-white/[0.06] px-4 pb-4 pt-2 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Entry command
                </label>
                <input
                  type="text"
                  value={entryCommand}
                  onChange={(e) => setEntryCommand(e.target.value)}
                  placeholder="e.g. npm start or node server.js"
                  className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Command run when the container starts (overrides template
                  default).
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Build command
                </label>
                <input
                  type="text"
                  value={buildCommand}
                  onChange={(e) => setBuildCommand(e.target.value)}
                  placeholder="e.g. npm run build"
                  className="w-full rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Run during Docker build (overrides template default).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="border-t border-white/[0.06] bg-black/20">
          <button
            type="button"
            onClick={() => toggleAccordion("env")}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/[0.04] transition"
            aria-expanded={accordionOpen.env}
          >
            <span>Environment Variables</span>
            <svg
              className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${accordionOpen.env ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {accordionOpen.env && (
            <div className="border-t border-white/[0.06] px-4 pb-4 pt-2 space-y-2">
              <div className="flex flex-wrap items-center justify-end gap-2">
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
                  + Import Environment Variables
                </button>
                <span className="text-zinc-600" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  onClick={addEnvRow}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  + Add Variable
                </button>
              </div>
              <div className="space-y-2">
                {envEntries.map((e, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={e.key}
                      onChange={(ev) => updateEnvRow(i, "key", ev.target.value)}
                      placeholder="KEY"
                      className="w-32 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="text"
                      value={e.value}
                      onChange={(ev) =>
                        updateEnvRow(i, "value", ev.target.value)
                      }
                      placeholder="value"
                      className="flex-1 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => removeEnvRow(i)}
                      className="rounded p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                Set in the container at runtime. Leave key empty to skip. Upload
                a .env file to load flat KEY=value lines.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary px-4 py-2 font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create App"}
        </button>
        <Link
          href={cancelHref}
          className="rounded-native-sm border border-white/[0.06] px-4 py-2 text-zinc-300 hover:bg-white/[0.06]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
