export type AgentRow = {
  keyId: string;
  agentId: string | null;
  name: string;
  status: "online" | "offline" | "degraded";
  connectedAt: string | null;
  lastSeenAt: string | null;
};
