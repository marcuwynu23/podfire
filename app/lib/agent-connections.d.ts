export function listAgents(): Array<{ id: string; name: string; connectedAt: string }>;
export function getFirstAgent(): { id: string; name: string; ws: unknown } | null;
export function dispatchJob(payload: Record<string, unknown>): boolean;
