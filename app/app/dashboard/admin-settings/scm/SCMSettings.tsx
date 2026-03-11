"use client";

import { useState, useEffect } from "react";

type SettingsStatus = Record<string, { set: boolean }>;

function EyeButton({
  show,
  onClick,
}: {
  show: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gl-text-muted hover:text-gl-text focus:outline-none"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

export function SCMSettings() {
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [defaultScm, setDefaultScm] = useState<"github" | "gitlab">("github");
  const [githubClientId, setGitHubClientId] = useState("");
  const [githubClientSecret, setGitHubClientSecret] = useState("");
  const [showGitHubSecret, setShowGitHubSecret] = useState(false);
  const [gitlabClientId, setGitLabClientId] = useState("");
  const [gitlabClientSecret, setGitLabClientSecret] = useState("");
  const [showGitLabSecret, setShowGitLabSecret] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setStatus(data.settings);
        if (data.values) setValues(data.values);
        const ds = data.values?.default_scm?.toLowerCase();
        if (ds === "gitlab" || ds === "github") setDefaultScm(ds);
      })
      .catch(() => setStatus({}))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, string> = { default_scm: defaultScm };
    if (githubClientId.trim()) body.github_client_id = githubClientId.trim();
    if (githubClientSecret.trim())
      body.github_client_secret = githubClientSecret.trim();
    if (gitlabClientId.trim()) body.gitlab_client_id = gitlabClientId.trim();
    if (gitlabClientSecret.trim())
      body.gitlab_client_secret = gitlabClientSecret.trim();

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMessage({ type: "ok", text: "SCM settings saved." });
      setGitHubClientSecret("");
      setGitLabClientSecret("");
      fetch("/api/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) setStatus(d.settings);
          if (d.values) setValues(d.values);
          const ds = d.values?.default_scm?.toLowerCase();
          if (ds === "gitlab" || ds === "github") setDefaultScm(ds);
        });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gl-text-muted">Loading…</p>;
  }

  const set = (key: string) => status?.[key]?.set ?? false;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <p
          className={`rounded-native-sm border px-4 py-2 text-sm ${
            message.type === "ok"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <section className="rounded-native border border-gl-edge bg-gl-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gl-text">Default SCM</h2>
        <p className="mt-1 text-sm text-gl-text-muted">
          Choose which source control provider to use by default for OAuth and
          repository operations.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="default_scm"
              checked={defaultScm === "github"}
              onChange={() => setDefaultScm("github")}
              className="text-primary focus:ring-primary"
            />
            <span className="text-sm text-gl-text">GitHub</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="default_scm"
              checked={defaultScm === "gitlab"}
              onChange={() => setDefaultScm("gitlab")}
              className="text-primary focus:ring-primary"
            />
            <span className="text-sm text-gl-text">GitLab</span>
          </label>
        </div>
      </section>

      <section className="rounded-native border border-gl-edge bg-gl-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gl-text">GitHub OAuth</h2>
        <p className="mt-1 text-sm text-gl-text-muted">
          Client ID and Client Secret for GitHub login. Callback URL is from .env
          (e.g. http://localhost:3000/api/github/callback).
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              GitHub Client ID
            </label>
            <input
              type="text"
              value={githubClientId}
              onChange={(e) => setGitHubClientId(e.target.value)}
              placeholder={
                set("github_client_id") ? "Currently set" : "OAuth App Client ID"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              GitHub Client Secret
            </label>
            <input
              type={showGitHubSecret ? "text" : "password"}
              value={githubClientSecret}
              onChange={(e) => setGitHubClientSecret(e.target.value)}
              placeholder={
                set("github_client_secret")
                  ? "•••••••• (leave blank to keep current)"
                  : "OAuth App Client Secret"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 pr-10 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <EyeButton
              show={showGitHubSecret}
              onClick={() => setShowGitHubSecret((v) => !v)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-native border border-gl-edge bg-gl-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gl-text">GitLab OAuth</h2>
        <p className="mt-1 text-sm text-gl-text-muted">
          Application ID and Secret for GitLab OAuth. Configure an OAuth
          application in your GitLab instance and set the callback URL (e.g.
          http://localhost:3000/api/gitlab/callback).
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              GitLab Application ID
            </label>
            <input
              type="text"
              value={gitlabClientId}
              onChange={(e) => setGitLabClientId(e.target.value)}
              placeholder={
                set("gitlab_client_id") ? "Currently set" : "OAuth Application ID"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gl-text-muted">
              GitLab Secret
            </label>
            <input
              type={showGitLabSecret ? "text" : "password"}
              value={gitlabClientSecret}
              onChange={(e) => setGitLabClientSecret(e.target.value)}
              placeholder={
                set("gitlab_client_secret")
                  ? "•••••••• (leave blank to keep current)"
                  : "OAuth Application Secret"
              }
              className="w-full rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 pr-10 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <EyeButton
              show={showGitLabSecret}
              onClick={() => setShowGitLabSecret((v) => !v)}
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
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
