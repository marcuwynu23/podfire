"use client";

import {useRef} from "react";
import type {EnvEntry} from "../components/types";
import {FormAccordion} from "../components/FormAccordion";

/** Parse .env-style content into flat key/value entries. Comments and empty lines skipped. */
export function parseEnvFile(text: string): EnvEntry[] {
  const entries: EnvEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
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

export function buildEnvObject(
  envEntries: EnvEntry[],
): Record<string, string> | null {
  const obj: Record<string, string> = {};
  for (const e of envEntries) {
    const k = e.key.trim();
    if (k) obj[k] = e.value.trim();
  }
  return Object.keys(obj).length ? obj : null;
}

type EnvSectionProps = {
  open: boolean;
  onToggle: () => void;
  envEntries: EnvEntry[];
  setEnvEntries: React.Dispatch<React.SetStateAction<EnvEntry[]>>;
};

export function EnvSection({
  open,
  onToggle,
  envEntries,
  setEnvEntries,
}: EnvSectionProps) {
  const envFileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <FormAccordion
      title="Environment Variables"
      open={open}
      onToggle={onToggle}
      className="border-t border-gl-edge bg-gl-input-bg"
    >
      <div className="space-y-2">
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
          <span className="text-gl-text-muted" aria-hidden>
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
                className="w-32 rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                value={e.value}
                onChange={(ev) => updateEnvRow(i, "value", ev.target.value)}
                placeholder="value"
                className="flex-1 rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-2 text-sm text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => removeEnvRow(i)}
                className="rounded p-2 text-gl-text-muted hover:bg-gl-hover hover:text-gl-text"
                aria-label="Remove row"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gl-text-muted">
          Set in the container at runtime. Leave key empty to skip. Upload a
          .env file to load flat KEY=value lines.
        </p>
      </div>
    </FormAccordion>
  );
}
