import type { Deployment, Service } from "@prisma/client";

export type ServiceWithDeployments = Service & {
  deployments: Deployment[];
  replicas?: number;
  domain?: string | null;
};

export type DiagnosticsResult = {
  stackName: string;
  serviceName: string;
  expectedPort: number;
  expectedHost: string;
  serviceExists: boolean;
  serviceTasksSummary: string;
  serviceInspectSnippet: string;
  containerReachable: boolean;
  containerHttpStatus: number | null;
  containerCurlError: string | null;
  traefikLogs: string;
  traefikMentionsService: boolean;
  verdict: string;
  summary: string;
};

export type { Deployment, Service };
