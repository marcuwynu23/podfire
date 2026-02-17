import { execSync } from "child_process";

const REGISTRY = process.env.DOCKER_REGISTRY?.trim() || "";

/** When true, images are used locally only (no registry push). */
export function useLocalOnly(): boolean {
  return REGISTRY === "";
}

export function buildImage(contextPath: string, imageTag: string): void {
  execSync(`docker build -t ${imageTag} .`, {
    cwd: contextPath,
    stdio: "inherit",
  });
}

export function pushImage(imageTag: string): void {
  execSync(`docker push ${imageTag}`, { stdio: "inherit" });
}

export function getImageTag(serviceName: string, commitOrTag: string): string {
  const safe = sanitizeForDocker(serviceName);
  if (REGISTRY === "") {
    return `${safe}:${commitOrTag}`;
  }
  return `${REGISTRY}/${safe}:${commitOrTag}`;
}

export function sanitizeForDocker(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "app";
}
