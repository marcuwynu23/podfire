"use client";

import { AccordionSection } from "./components/AccordionSection";
import { DomainSetting } from "./domain/DomainSetting";
import { DeployModeSetting } from "./deployment/DeployModeSetting";
import { DiagnosticsSetting } from "./diagnostics/DiagnosticsSetting";
import { BuildSetting } from "./buildsetting/BuildSetting";
import { DangerZoneSetting } from "./danger-zone/DangerZoneSetting";

export function SettingsPanel({
  serviceId,
  appName,
  deployMode,
  domain,
  diagnosticsEnabled,
  entryCommand,
  buildCommand,
  outputDirectory,
  onSaved,
}: {
  serviceId: string;
  appName: string;
  deployMode: string;
  domain?: string | null;
  diagnosticsEnabled?: boolean;
  entryCommand?: string | null;
  buildCommand?: string | null;
  outputDirectory?: string | null;
  onSaved: () => void;
}) {
  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-base font-semibold text-gl-text">Settings</h2>
      <p className="mt-0.5 text-sm text-gl-text-muted">
        Domain, deploy mode, diagnostics, build options, and danger zone.
      </p>

      <div className="mt-4 sm:mt-6">
        <AccordionSection id="domainSection" title="Domain" defaultOpen>
          <DomainSetting
            serviceId={serviceId}
            currentDomain={domain ?? null}
            onSaved={onSaved}
          />
        </AccordionSection>

        <AccordionSection id="deploymentSection" title="Deploy mode">
          <DeployModeSetting
            serviceId={serviceId}
            deployMode={deployMode}
            onSaved={onSaved}
          />
        </AccordionSection>

        <AccordionSection id="diagnosticsSection" title="Diagnostics">
          <DiagnosticsSetting
            serviceId={serviceId}
            diagnosticsEnabled={diagnosticsEnabled ?? false}
            onSaved={onSaved}
          />
        </AccordionSection>

        <AccordionSection id="buildSection" title="Build configuration">
          <BuildSetting
            serviceId={serviceId}
            entryCommand={entryCommand ?? null}
            buildCommand={buildCommand ?? null}
            outputDirectory={outputDirectory ?? null}
            onSaved={onSaved}
          />
        </AccordionSection>

        <AccordionSection id="dangerZoneSection" title="Danger zone">
          <DangerZoneSetting serviceId={serviceId} appName={appName} />
        </AccordionSection>
      </div>
    </div>
  );
}
