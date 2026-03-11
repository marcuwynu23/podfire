"use client";

import {useRef, useEffect} from "react";
import type {Repo, Branch} from "../components/types";
import {FormAccordion} from "../components/FormAccordion";

type ApplicationSectionProps = {
  open: boolean;
  onToggle: () => void;
  name: string;
  setName: (v: string) => void;
  selectedRepo: string;
  setSelectedRepo: (v: string) => void;
  repoSearch: string;
  setRepoSearch: (v: string) => void;
  repoDropdownOpen: boolean;
  setRepoDropdownOpen: (v: boolean) => void;
  branch: string;
  setBranch: (v: string) => void;
  repos: Repo[];
  branches: Branch[];
  filteredRepos: Repo[];
  domains: string[];
  selectedDomain: string;
  setSelectedDomain: (v: string) => void;
};

export function ApplicationSection({
  open,
  onToggle,
  name,
  setName,
  selectedRepo,
  setSelectedRepo,
  repoSearch,
  setRepoSearch,
  repoDropdownOpen,
  setRepoDropdownOpen,
  branch,
  setBranch,
  repos,
  branches,
  filteredRepos,
  domains,
  selectedDomain,
  setSelectedDomain,
}: ApplicationSectionProps) {
  const repoDropdownRef = useRef<HTMLDivElement>(null);

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
  }, [setRepoDropdownOpen]);

  return (
    <FormAccordion
      title="Application Information"
      open={open}
      onToggle={onToggle}
      className="bg-gl-input-bg"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gl-text-muted">
          App name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-app"
          className="w-full rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          required
        />
      </div>
      <div ref={repoDropdownRef} className="relative">
        <label className="mb-1 block text-sm font-medium text-gl-text-muted">
          GitHub repository
        </label>
        <div className="relative">
          <input
            type="text"
            value={repoDropdownOpen ? repoSearch : selectedRepo || repoSearch}
            onChange={(e) => {
              setRepoSearch(e.target.value);
              setRepoDropdownOpen(true);
              if (!e.target.value) setSelectedRepo("");
            }}
            onFocus={() => {
              setRepoDropdownOpen(true);
              if (selectedRepo && !repoSearch) setRepoSearch(selectedRepo);
            }}
            placeholder="Search repositories..."
            className="w-full rounded-lg border border-gl-edge bg-gl-input-bg py-2 pl-3 pr-10 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoComplete="off"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gl-text-muted">
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
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-native-sm border border-gl-edge bg-gl-card py-1 shadow-sm">
            {filteredRepos.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gl-text-muted">
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
                    className="w-full px-3 py-2 text-left text-sm text-gl-text hover:bg-gl-hover focus:bg-white/5 focus:outline-none"
                  >
                    {r.full_name}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        {selectedRepo && !repoDropdownOpen && (
          <p className="mt-1 text-xs text-gl-text-muted">
            Selected: {selectedRepo}
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gl-text-muted">
          Branch
        </label>
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="w-full rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gl-text-muted">
          Domain
        </label>
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="w-full rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Default (&lt;name&gt;.localhost)</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gl-text-muted">
          Domains from Admin settings → DNS. Leave default for local routing
          only.
        </p>
      </div>
    </FormAccordion>
  );
}
