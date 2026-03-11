"use client";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import type {Repo, CreateAppFormProps} from "./types";
import {ApplicationSection} from "../appinfo/ApplicationSection";
import {BuildSection} from "../buildinfo/BuildSection";
import {EnvSection, buildEnvObject} from "../environment/EnvSection";

export function CreateAppForm({
  cancelHref = "/dashboard",
  contained = false,
}: CreateAppFormProps) {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [branches, setBranches] = useState<{name: string}[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [branch, setBranch] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [name, setName] = useState("");
  const [entryCommand, setEntryCommand] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [envEntries, setEnvEntries] = useState<{key: string; value: string}[]>([
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
              if (
                item &&
                typeof item === "object" &&
                "domain" in item &&
                typeof (item as {domain: string}).domain === "string"
              )
                return (item as {domain: string}).domain.trim();
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
          domain: selectedDomain.trim() || undefined,
          entryCommand: entryCommand.trim() || undefined,
          buildCommand: buildCommand.trim() || undefined,
          env: buildEnvObject(envEntries) ?? undefined,
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
      className={`w-full space-y-6 ${contained ? "" : "rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm"}`}
    >
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-1 border border-gl-edge rounded-native-sm overflow-hidden">
        <ApplicationSection
          open={accordionOpen.application}
          onToggle={() => toggleAccordion("application")}
          name={name}
          setName={setName}
          selectedRepo={selectedRepo}
          setSelectedRepo={setSelectedRepo}
          repoSearch={repoSearch}
          setRepoSearch={setRepoSearch}
          repoDropdownOpen={repoDropdownOpen}
          setRepoDropdownOpen={setRepoDropdownOpen}
          branch={branch}
          setBranch={setBranch}
          repos={repos}
          branches={branches}
          filteredRepos={filteredRepos}
          domains={domains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
        />
        <BuildSection
          open={accordionOpen.build}
          onToggle={() => toggleAccordion("build")}
          entryCommand={entryCommand}
          setEntryCommand={setEntryCommand}
          buildCommand={buildCommand}
          setBuildCommand={setBuildCommand}
        />
        <EnvSection
          open={accordionOpen.env}
          onToggle={() => toggleAccordion("env")}
          envEntries={envEntries}
          setEnvEntries={setEnvEntries}
        />
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
          className="rounded-native-sm border border-gl-edge px-4 py-2 text-gl-text-muted hover:bg-gl-hover"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
