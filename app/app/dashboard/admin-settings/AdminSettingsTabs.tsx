"use client";

import { useState } from "react";
import { GatewayStatus } from "./gateway/GatewayStatus";
import { GatewayActions } from "./gateway/GatewayActions";
import { DNSSettings } from "./dns/DNSSettings";
import { SCMSettings } from "./scm/SCMSettings";
import { RegistrySettings } from "./registry/RegistrySettings";

const tabs = [
  { id: "gateway", label: "Gateway" },
  { id: "dns", label: "DNS" },
  { id: "scm", label: "SCM" },
  { id: "registry", label: "Registry" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type Service = {
  id: string;
  name: string;
  stackName: string | null;
  domain: string | null;
  deployments: { status: string }[];
};

export function AdminSettingsTabs({
  services,
}: {
  services: Service[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("gateway");

  return (
    <div className="space-y-4">
      <nav
        className="flex gap-0 border-b border-gl-edge"
        aria-label="Admin sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-gl-text-muted hover:border-gl-edge hover:text-gl-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="min-h-[20rem]">
        {activeTab === "gateway" && (
          <div className="space-y-6">
            <GatewayStatus />
            <GatewayActions />
            <div className="rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-gl-text">Your apps</h2>
              <p className="mb-4 text-sm text-gl-text-muted">
                Each app is reachable at{" "}
                <code className="rounded-native-sm border border-gl-edge bg-gl-input-bg px-1">
                  {"<name>.localhost"}
                </code>{" "}
                or at{" "}
                <code className="rounded-native-sm border border-gl-edge bg-gl-input-bg px-1">
                  {"<name>.<domain>"}
                </code>{" "}
                when a domain is assigned (Admin → DNS). Gateway must be running.
              </p>
              {services.length === 0 ? (
                <p className="text-gl-text-muted">
                  No apps yet. Create one from the dashboard.
                </p>
              ) : (
                <ul className="space-y-2">
                  {services.map((s) => {
                    const host = (s.stackName ?? s.name)
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-");
                    const hostDisplay = s.domain ? `${host}.${s.domain}` : `${host}.localhost`;
                    const latest = s.deployments[0]?.status;
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-native-sm border border-gl-edge bg-gl-input-bg px-4 py-3"
                      >
                        <div>
                          <span className="font-medium text-gl-text">
                            {s.name}
                          </span>
                          <span className="ml-2 text-sm text-gl-text-muted">
                            → {hostDisplay}
                          </span>
                        </div>
                        <span className="text-sm text-gl-text-muted">
                          {latest ?? "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
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
