import * as fs from "fs";
import * as path from "path";
import { sanitizeForDocker } from "./docker";
import { runCommand, formatOutput } from "./run-command";

const NETWORK = process.env.TRAEFIK_NETWORK ?? "web";

export function generateStackYaml(
  stackName: string,
  imageTag: string,
  port: number = 80,
  domain?: string | null
): string {
  const safe = sanitizeForDocker(stackName);
  const host = domain?.trim() ? `${safe}.${domain.trim()}` : `${safe}.localhost`;
  return `version: "3.9"

services:
  app:
    image: ${imageTag}
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${safe}.rule=Host(\`${host}\`)"
      - "traefik.http.services.${safe}.loadbalancer.server.port=${port}"
    networks:
      - web

networks:
  web:
    external: true
`;
}

export function deployStack(stackName: string, yamlContent: string): void {
  const dir = path.join(process.cwd(), ".stack-tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const safe = sanitizeForDocker(stackName);
  const file = path.join(dir, `${safe}-stack.yml`);
  fs.writeFileSync(file, yamlContent);
  try {
    const result = runCommand(`docker stack deploy -c "${file}" ${safe}`);
    if (!result.success) {
      throw new Error(`docker stack deploy failed:\n${formatOutput(result)}`);
    }
  } finally {
    try {
      fs.unlinkSync(file);
    } catch {
      // ignore
    }
  }
}

export function sanitizeStackName(name: string): string {
  return sanitizeForDocker(name);
}

/** Remove a Docker stack (e.g. when deleting a service). Ignores errors if stack doesn't exist. */
export function removeStack(stackName: string): void {
  const safe = sanitizeForDocker(stackName);
  const result = runCommand(`docker stack rm ${safe}`);
  if (!result.success && result.stderr && !result.stderr.includes("Nothing to do")) {
    console.warn("docker stack rm:", formatOutput(result));
  }
}
