import * as fs from "fs";
import * as path from "path";
import { sanitizeForDocker } from "./docker.js";
import { runCommand, formatOutput } from "./run-command.js";

function envToYaml(env: Record<string, string> | undefined): string {
  if (!env || Object.keys(env).length === 0) return "";
  const lines = Object.entries(env)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `      ${k}: ${typeof v === "string" && (v.includes("\n") || v.includes(":") || v.includes("#") ? JSON.stringify(String(v)) : String(v))}`);
  if (lines.length === 0) return "";
  return "    environment:\n" + lines.join("\n") + "\n";
}

function resourcesBlock(cpuLimit?: string | null, memoryLimit?: string | null): string {
  if (!cpuLimit?.trim() && !memoryLimit?.trim()) return "";
  const c = cpuLimit?.trim();
  const m = memoryLimit?.trim();
  const parts: string[] = [];
  if (c) parts.push(`        cpus: "${c}"`);
  if (m) parts.push(`        memory: ${m}`);
  if (parts.length === 0) return "";
  return "      resources:\n        limits:\n" + parts.join("\n") + "\n";
}

export function generateStackYaml(
  stackName: string,
  imageTag: string,
  port: number = 80,
  options?: { env?: Record<string, string>; replicas?: number; domain?: string | null; cpuLimit?: string | null; memoryLimit?: string | null }
): string {
  const safe = sanitizeForDocker(stackName);
  const domain = options?.domain?.trim();
  const host = domain ? `${safe}.${domain}` : `${safe}.localhost`;
  const envBlock = envToYaml(options?.env);
  const replicas = Math.min(32, Math.max(1, options?.replicas ?? 1));
  const resources = resourcesBlock(options?.cpuLimit, options?.memoryLimit);
  // In Docker Swarm, service name seen by Traefik is stackname_servicename (e.g. vite_app)
  const traefikServiceName = `${safe}_app`;
  // HTTP only here; SSL/TLS is handled by Traefik (gateway) via app/traefik and app API traefik config
  return `version: "3.9"

networks:
  ${NETWORK}:
    external: true

services:
  app:
    image: ${imageTag}
${envBlock}    networks:
      - ${NETWORK}
    deploy:
      replicas: ${replicas}
${resources}      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=${NETWORK}"
        - "traefik.http.routers.${safe}.rule=Host(\`${host}\`)"
        - "traefik.http.routers.${safe}.entrypoints=web"
        - "traefik.http.routers.${safe}.service=${traefikServiceName}"
        - "traefik.http.services.${traefikServiceName}.loadbalancer.server.port=${port}"
`;
}

const NETWORK = process.env.TRAEFIK_NETWORK ?? "web";

/** Create the overlay network if it does not exist (required for stack deploy). Uses --attachable so diagnostics can run curl from a temp container. */
function ensureSwarmNetwork(): void {
  const result = runCommand(`docker network create --driver overlay --attachable ${NETWORK}`);
  if (!result.success && !result.stderr.includes("already exists")) {
    console.warn("[stack] Could not create network:", result.stderr || result.stdout);
  }
}

export function deployStack(stackName: string, yamlContent: string): void {
  ensureSwarmNetwork();
  const dir = path.join(process.cwd(), ".stack-tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const safe = sanitizeForDocker(stackName);
  const file = path.join(dir, `${safe}-stack.yml`);
  fs.writeFileSync(file, yamlContent);
  try {
    const result = runCommand(`docker stack deploy -c "${file}" ${safe}`);
    if (!result.success) throw new Error(`docker stack deploy failed:\n${formatOutput(result)}`);
  } finally {
    try {
      fs.unlinkSync(file);
    } catch {}
  }
}

export function sanitizeStackName(name: string): string {
  return sanitizeForDocker(name);
}

const TRAEFIK_STACK_NAME = "traefik";

export function deployTraefikStack(yamlContent: string): void {
  ensureSwarmNetwork();
  const dir = path.join(process.cwd(), ".stack-tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "traefik-stack.yml");
  fs.writeFileSync(file, yamlContent);
  try {
    const result = runCommand(`docker stack deploy -c "${file}" ${TRAEFIK_STACK_NAME}`);
    if (!result.success) throw new Error(`traefik deploy failed:\n${formatOutput(result)}`);
  } finally {
    try {
      fs.unlinkSync(file);
    } catch {}
  }
}

export function removeTraefikStack(): void {
  const result = runCommand(`docker stack rm ${TRAEFIK_STACK_NAME}`);
  if (!result.success && !result.stderr?.includes("Nothing found")) {
    throw new Error(`traefik remove failed:\n${formatOutput(result)}`);
  }
}

export function isTraefikRunning(): boolean {
  const result = runCommand("docker stack ps traefik --no-trunc -q");
  if (!result.success) return false;
  const out = (result.stdout || "").trim();
  return out.length > 0;
}
