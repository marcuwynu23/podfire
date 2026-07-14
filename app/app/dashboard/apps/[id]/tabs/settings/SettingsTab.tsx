"use client";

import { AccordionSection } from "./components/AccordionSection";
import { DomainSetting } from "./domain/DomainSetting";
import { DeployModeSetting } from "./deployment/DeployModeSetting";
import { DiagnosticsSetting } from "./diagnostics/DiagnosticsSetting";
import { BuildSetting } from "./buildsetting/BuildSetting";
import { PortSetting } from "./port/PortSetting";
import { DangerZoneSetting } from "./danger-zone/DangerZoneSetting";
import { EnvSetting } from "./env/EnvSetting";

export function SettingsPanel({
  serviceId,
  appName,
  deployMode,
  domain,
  port,
  diagnosticsEnabled,
  entryCommand,
  buildCommand,
  outputDirectory,
  env,
  onSaved,
}: {
  serviceId: string;
  appName: string;
  deployMode: string;
  domain?: string | null;
  port?: number | null;
  diagnosticsEnabled?: boolean;
  entryCommand?: string | null;
  buildCommand?: string | null;
  outputDirectory?: string | null;
  env?: string | null;
  onSaved: () => void;
}) {
  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-base font-semibold text-gl-text">Settings</h2>
      <p className="mt-0.5 text-sm text-gl-text-muted">
        Domain, container port, deploy mode, diagnostics, build options, environment variables, and danger zone.
      </p>

      <div className="mt-4 sm:mt-6">
        <AccordionSection id="domainSection" title="Domain" defaultOpen>
          <DomainSetting
            serviceId={serviceId}
            currentDomain={domain ?? null}
            onSaved={onSaved}
          />
        </AccordionSection>

        <AccordionSection id="portSection" title="Container port" defaultOpen>
          <PortSetting
            serviceId={serviceId}
            currentPort={port ?? null}
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

        <AccordionSection id="envSection" title="Environment variables" defaultOpen>
          <EnvSetting
            serviceId={serviceId}
            currentEnv={env ?? null}
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
