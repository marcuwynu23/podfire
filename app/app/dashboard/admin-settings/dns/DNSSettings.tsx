"use client";

import { useState, useEffect, useRef } from "react";

type SettingsStatus = Record<string, { set: boolean }>;

type DomainRow = { domain: string; ssl: "letsencrypt" | "cloudflare" };

const defaultRow: DomainRow = { domain: "", ssl: "letsencrypt" };

export function DNSSettings() {
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [values, setValues] = useState<{ dns_domains?: string; ssl_provider?: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [rows, setRows] = useState<DomainRow[]>([{ ...defaultRow }]);
  const [cloudflareOpen, setCloudflareOpen] = useState(false);
  const [cloudflareToken, setCloudflareToken] = useState("");
  const certPemRef = useRef<HTMLInputElement>(null);
  const certKeyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setStatus(data.settings);
        if (data.values?.dns_domains) {
          try {
            const parsed = JSON.parse(data.values.dns_domains) as unknown;
            if (Array.isArray(parsed) && parsed.length > 0) {
              const loaded: DomainRow[] = parsed.map((item: unknown) => {
                if (item && typeof item === "object" && "domain" in item && typeof (item as DomainRow).domain === "string") {
                  const row = item as { domain: string; ssl?: string };
                  return {
                    domain: row.domain,
                    ssl: row.ssl === "cloudflare" ? "cloudflare" : "letsencrypt",
                  };
                }
                if (typeof item === "string")
                  return { domain: item, ssl: "letsencrypt" as const };
                return { ...defaultRow };
              });
              setRows(loaded);
            }
          } catch {
            setRows([{ ...defaultRow }]);
          }
        }
        if (data.values) setValues(data.values);
      })
      .catch(() => setStatus({}))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const filtered = rows.filter((r) => r.domain.trim());
    const body: Record<string, string> = {
      dns_domains: JSON.stringify(filtered.length ? filtered : []),
    };
    if (cloudflareToken.trim()) body.cloudflare_api_token = cloudflareToken.trim();
    const pemFile = certPemRef.current?.files?.[0];
    const keyFile = certKeyRef.current?.files?.[0];
    if (pemFile) body.origin_cert_pem = await pemFile.text();
    if (keyFile) body.origin_private_key_pem = await keyFile.text();

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMessage({ type: "ok", text: "DNS settings saved." });
      setCloudflareToken("");
      certPemRef.current && (certPemRef.current.value = "");
      certKeyRef.current && (certKeyRef.current.value = "");
      fetch("/api/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) setStatus(d.settings);
          if (d.values) setValues(d.values);
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

  function addRow() {
    setRows((prev) => [...prev, { ...defaultRow }]);
  }

  function removeRow(i: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function setRowDomain(i: number, domain: string) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], domain };
      return next;
    });
  }

  function setRowSsl(i: number, ssl: "letsencrypt" | "cloudflare") {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ssl };
      return next;
    });
  }

  const hasCloudflareDomain = rows.some((r) => r.ssl === "cloudflare");

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

      <section className="rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gl-text">DNS & domains</h2>
        <p className="mt-1 text-sm text-gl-text-muted">
          Domains to manage. Set SSL/TLS per domain: Let's Encrypt or Cloudflare.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="text-left text-gl-text-muted">
                <th className="pb-2 font-medium">Domain</th>
                <th className="pb-2 font-medium">SSL / TLS</th>
                <th className="w-10 pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-gl-edge">
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={row.domain}
                      onChange={(e) => setRowDomain(i, e.target.value)}
                      placeholder="example.com"
                      className="w-full rounded border border-gl-edge bg-gl-input-bg px-3 py-1.5 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex flex-wrap gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name={`ssl-${i}`}
                          checked={row.ssl === "letsencrypt"}
                          onChange={() => setRowSsl(i, "letsencrypt")}
                          className="border-gl-edge text-primary focus:ring-primary"
                        />
                        <span className="text-gl-text">Let's Encrypt</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name={`ssl-${i}`}
                          checked={row.ssl === "cloudflare"}
                          onChange={() => setRowSsl(i, "cloudflare")}
                          className="border-gl-edge text-primary focus:ring-primary"
                        />
                        <span className="text-gl-text">Cloudflare</span>
                      </label>
                    </div>
                  </td>
                  <td className="py-2 pl-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length <= 1}
                      className="text-gl-text-muted hover:text-red-400 disabled:opacity-40"
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 text-sm text-primary hover:underline"
          >
            + Add domain
          </button>
        </div>
      </section>

      <section className="rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gl-text">Cloudflare (for Cloudflare SSL domains)</h2>
        <p className="mt-1 text-sm text-gl-text-muted">
          API token and origin certificates are used only for domains that have SSL set to Cloudflare.
        </p>
        {hasCloudflareDomain && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setCloudflareOpen((o) => !o)}
              className="rounded border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm font-medium text-gl-text transition hover:bg-gl-hover"
            >
              {cloudflareOpen ? "Hide" : "Cloudflare settings"} (API token & certificates)
            </button>
            {cloudflareOpen && (
              <div className="mt-4 space-y-4 rounded border border-gl-edge bg-gl-input-bg/50 p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gl-text-muted">
                    Cloudflare API token
                  </label>
                  <input
                    type="password"
                    value={cloudflareToken}
                    onChange={(e) => setCloudflareToken(e.target.value)}
                    placeholder={
                      set("cloudflare_api_token")
                        ? "•••••••• (leave blank to keep current)"
                        : "Set token"
                    }
                    className="w-full rounded border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gl-text-muted">
                    Origin certificate (.pem)
                  </label>
                  <input
                    ref={certPemRef}
                    type="file"
                    accept=".pem,.crt"
                    className="w-full rounded border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm text-gl-text file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-primary-hover"
                  />
                  {set("origin_cert_pem") && (
                    <p className="mt-1 text-xs text-gl-text-muted">Certificate is set. Upload a new file to replace.</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gl-text-muted">
                    Private key (.key)
                  </label>
                  <input
                    ref={certKeyRef}
                    type="file"
                    accept=".key,.pem"
                    className="w-full rounded border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm text-gl-text file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-primary-hover"
                  />
                  {set("origin_private_key_pem") && (
                    <p className="mt-1 text-xs text-gl-text-muted">Private key is set. Upload a new file to replace.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
