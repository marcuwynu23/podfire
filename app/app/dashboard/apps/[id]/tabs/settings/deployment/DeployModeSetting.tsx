"use client";

import { useState, useEffect, useRef } from "react";

const DEPLOY_MODE_OPTIONS: { value: "manual" | "auto"; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto (watch branch)" },
];

function DeployModeSelect({
  value,
  onChange,
  disabled,
}: {
  value: "manual" | "auto";
  onChange: (value: "manual" | "auto") => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayLabel = DEPLOY_MODE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-[12rem]">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select deploy mode"
        className="flex w-full items-center justify-between gap-2 rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-left text-sm text-gl-text transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 [&_svg]:shrink-0"
      >
        <span>{displayLabel}</span>
        <svg
          className={`h-4 w-4 text-gl-text-muted transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-10 mt-1 w-full rounded-native-sm border border-gl-edge bg-gl-card py-1 shadow-lg"
        >
          {DEPLOY_MODE_OPTIONS.map((opt) => (
            <li key={opt.value} role="option" aria-selected={value === opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition hover:bg-gl-input-bg ${
                  value === opt.value ? "bg-primary/10 text-primary" : "text-gl-text"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DeployModeSetting({
  serviceId,
  deployMode,
  onSaved,
}: {
  serviceId: string;
  deployMode: string;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"manual" | "auto">(deployMode === "auto" ? "auto" : "manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(deployMode === "auto" ? "auto" : "manual");
  }, [deployMode]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deployMode: mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to save");
        return;
      }
      onSaved();
    } catch {
      setError("Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-3 rounded-native border border-gl-edge bg-gl-input-bg p-4">
      <h3 className="text-sm font-medium text-gl-text">Deploy mode</h3>
      <p className="mt-0.5 text-xs text-gl-text-muted">
        Manual: deploy only when you click Deploy. Auto: watch the app branch
        and deploy when there are new commits (call the auto-deploy cron
        periodically).
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DeployModeSelect
          value={mode}
          onChange={setMode}
          disabled={saving}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
    </section>
  );
}
