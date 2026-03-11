"use client";

import {useState} from "react";
import {GatewayStatus} from "./gateway/GatewayStatus";
import {GatewayActions} from "./gateway/GatewayActions";
import {AppDiagnosticsTable} from "./gateway/AppDiagnosticsTable";
import {DNSSettings} from "./dns/DNSSettings";
import {SCMSettings} from "./scm/SCMSettings";
import {RegistrySettings} from "./registry/RegistrySettings";

const tabs = [
  {id: "gateway", label: "Gateway"},
  {id: "dns", label: "DNS"},
  {id: "scm", label: "SCM"},
  {id: "registry", label: "Registry"},
] as const;

const gatewaySubTabs = [
  {id: "status", label: "Status & Configuration"},
  {id: "diagnostics", label: "App Diagnostics"},
] as const;

type TabId = (typeof tabs)[number]["id"];
type GatewaySubTabId = (typeof gatewaySubTabs)[number]["id"];

type Service = {
  id: string;
  name: string;
  stackName: string | null;
  domain: string | null;
  deployments: {status: string}[];
};

export function AdminSettingsTabs({services}: {services: Service[]}) {
  const [activeTab, setActiveTab] = useState<TabId>("gateway");
  const [gatewaySubTab, setGatewaySubTab] = useState<GatewaySubTabId>("status");

  return (
    <div className="min-w-0 space-y-4">
      <nav
        className="flex w-full min-w-0 gap-0 border-b border-gl-edge"
        aria-label="Admin sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-w-0 flex-1 border-b-2 px-2 py-3 text-center text-sm font-medium transition sm:flex-none sm:px-4 sm:text-left ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-gl-text-muted hover:border-gl-edge hover:text-gl-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="min-h-[20rem] min-w-0">
        {activeTab === "gateway" && (
          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:gap-6">
            <nav
              className="flex w-full min-w-0 shrink-0 flex-row gap-0.5 border-b border-gl-edge pb-4 md:w-auto md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-6"
              aria-label="Gateway sections"
            >
              {gatewaySubTabs.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setGatewaySubTab(sub.id)}
                  className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2.5 text-center text-sm font-medium transition md:flex-none md:overflow-visible md:whitespace-normal md:px-4 md:text-left ${
                    gatewaySubTab === sub.id
                      ? "bg-primary/10 text-primary"
                      : "text-gl-text-muted hover:bg-gl-hover hover:text-gl-text"
                  }`}
                  title={sub.label}
                >
                  {sub.label}
                </button>
              ))}
            </nav>
            <div className="min-w-0 flex-1">
              {gatewaySubTab === "status" && (
                <div className="min-w-0 space-y-4 sm:space-y-6">
                  <GatewayStatus />
                  <GatewayActions />
                </div>
              )}
              {gatewaySubTab === "diagnostics" && (
                <AppDiagnosticsTable services={services} />
              )}
            </div>
          </div>
        )}

        {activeTab === "dns" && <DNSSettings />}
        {activeTab === "scm" && <SCMSettings />}
        {activeTab === "registry" && <RegistrySettings />}
      </div>
    </div>
  );
}
