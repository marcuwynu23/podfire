import {runCommand} from "./run-command.js";

const REGISTRY = process.env.DOCKER_REGISTRY?.trim() || "";

export function useLocalOnly(): boolean {
  return REGISTRY === "";
}

export function getImageTag(serviceName: string, commitOrTag: string): string {
  const safe = sanitizeForDocker(serviceName);
  if (REGISTRY === "") return `${safe}:${commitOrTag}`;
  return `${REGISTRY}/${safe}:${commitOrTag}`;
}

export function sanitizeForDocker(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "app";
}

export function detectExposedPort(imageTag: string): number | null {
  const result = runCommand(
    `docker image inspect "${imageTag}" --format '{{json .ContainerConfig.ExposedPorts}}'`,
  );
  if (!result.success) return null;
  const trimmed = (result.stdout ?? "").trim();
  if (!trimmed || trimmed === "null" || trimmed === "<no value>") return null;
  try {
    const obj = JSON.parse(trimmed);
    const keys = Object.keys(obj);
    if (keys.length === 0) return null;
    const port = parseInt(keys[0].split("/")[0], 10);
    return isNaN(port) ? null : port;
  } catch {
    return null;
  }
}
