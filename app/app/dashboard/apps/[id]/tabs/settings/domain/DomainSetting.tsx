"use client";

import { useState, useEffect, useRef } from "react";

const DEFAULT_LABEL = "Default (<name>.localhost)";

function DomainSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayLabel = value.trim() ? value : DEFAULT_LABEL;

  return (
    <div ref={ref} className="relative min-w-[12rem]">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select domain"
        className="flex w-full items-center justify-between gap-2 rounded-native-sm border border-gl-edge bg-gl-input-bg px-3 py-2 text-left text-sm text-gl-text transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 [&_svg]:shrink-0"
      >
        <span className={value.trim() ? "text-gl-text" : "text-gl-text-muted"}>
          {displayLabel}
        </span>
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
          className="absolute left-0 top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded-native-sm border border-gl-edge bg-gl-card py-1 shadow-lg"
        >
          <li role="option" aria-selected={value === ""}>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition hover:bg-gl-input-bg ${
                !value.trim() ? "bg-primary/10 text-primary" : "text-gl-text"
              }`}
            >
              {DEFAULT_LABEL}
            </button>
          </li>
          {options.map((d) => (
            <li key={d} role="option" aria-selected={value === d}>
              <button
                type="button"
                onClick={() => {
                  onChange(d);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition hover:bg-gl-input-bg ${
                  value === d ? "bg-primary/10 text-primary" : "text-gl-text"
                }`}
              >
                {d}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DomainSetting({
  serviceId,
  currentDomain,
  onSaved,
}: {
  serviceId: string;
  currentDomain: string | null;
  onSaved: () => void;
}) {
  const [domains, setDomains] = useState<string[]>([]);
  const [selected, setSelected] = useState(currentDomain ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              if (item && typeof item === "object" && "domain" in item && typeof (item as { domain: string }).domain === "string")
                return (item as { domain: string }).domain.trim();
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

  useEffect(() => {
    setSelected(currentDomain ?? "");
  }, [currentDomain]);

  async function saveAndUpdateRouting() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selected.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to save");
        return;
      }
      if (selected.trim()) {
        const routingRes = await fetch(`/api/services/${serviceId}/update-routing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
        });
        const routingData = await routingRes.json().catch(() => ({}));
        if (!routingRes.ok) {
          setError((routingData as { error?: string }).error ?? "Update routing failed");
          return;
        }
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
      <h3 className="text-sm font-medium text-gl-text">Domain</h3>
      <p className="mt-0.5 text-xs text-gl-text-muted">
        App host: &lt;name&gt;.localhost or &lt;name&gt;.&lt;domain&gt; when a domain is set. Domains come from Admin → DNS.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DomainSelect
          value={selected}
          options={domains}
          onChange={setSelected}
          disabled={saving}
        />
        <button
          type="button"
          onClick={saveAndUpdateRouting}
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : selected.trim() ? "Save & update routing" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
    </section>
  );
}
