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
