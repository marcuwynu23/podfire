"use client";

import {FormAccordion} from "../components/FormAccordion";

type BuildSectionProps = {
  open: boolean;
  onToggle: () => void;
  entryCommand: string;
  setEntryCommand: (v: string) => void;
  buildCommand: string;
  setBuildCommand: (v: string) => void;
  outputDirectory: string;
  setOutputDirectory: (v: string) => void;
};

export function BuildSection({
  open,
  onToggle,
  entryCommand,
  setEntryCommand,
  buildCommand,
  setBuildCommand,
  outputDirectory,
  setOutputDirectory,
}: BuildSectionProps) {
  return (
    <FormAccordion
      title="Build Configuration"
      open={open}
      onToggle={onToggle}
      className="border-t border-gl-edge bg-gl-input-bg"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gl-text-muted">
            Entry command
          </label>
          <input
            type="text"
            value={entryCommand}
            onChange={(e) => setEntryCommand(e.target.value)}
            placeholder="e.g. npm start or node server.js"
            className="w-full rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="mt-1 text-xs text-gl-text-muted">
            Command run when the container starts (overrides template default).
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gl-text-muted">
            Build command
          </label>
          <input
            type="text"
            value={buildCommand}
            onChange={(e) => setBuildCommand(e.target.value)}
            placeholder="e.g. npm run build"
            className="w-full rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="mt-1 text-xs text-gl-text-muted">
            Run during Docker build (overrides template default).
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gl-text-muted">
            Output directory
          </label>
          <input
            type="text"
            value={outputDirectory}
            onChange={(e) => setOutputDirectory(e.target.value)}
            placeholder="e.g. dist or .next"
            className="w-full rounded-lg border border-gl-edge bg-gl-input-bg px-3 py-2 text-gl-text placeholder-gl-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="mt-1 text-xs text-gl-text-muted">
            Path where the build writes output (used in Docker COPY). Leave empty for template default (e.g. dist for Vite, .next for Next.js).
          </p>
        </div>
      </div>
    </FormAccordion>
  );
}
