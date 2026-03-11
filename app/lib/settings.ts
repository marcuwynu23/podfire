import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";

const ENV_FALLBACK: Record<string, string> = {
  github_client_id: "GITHUB_CLIENT_ID",
  github_client_secret: "GITHUB_CLIENT_SECRET",
  gitlab_client_id: "GITLAB_CLIENT_ID",
  gitlab_client_secret: "GITLAB_CLIENT_SECRET",
  docker_registry: "DOCKER_REGISTRY",
  harbor_registry: "HARBOR_REGISTRY",
};

/** Get a setting value from DB (decrypted) or fallback to process.env. Returns null if not set. */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (row?.value) {
      try {
        return decrypt(row.value);
      } catch {
        return null;
      }
    }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021") return null; // table does not exist yet
    throw err;
  }
  const envKey = ENV_FALLBACK[key];
  if (envKey && process.env[envKey]) return process.env[envKey] ?? null;
  return null;
}

/** Set a setting (value is stored encrypted). */
export async function setSetting(key: string, value: string): Promise<void> {
  const toStore = encrypt(value);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: toStore },
    update: { value: toStore },
  });
}

/** Get list of setting keys and whether each is set (for UI). Secrets are not returned. */
export async function getSettingsStatus(): Promise<Record<string, { set: boolean }>> {
  const keys = [
    "cloudflare_api_token",
    "origin_cert_pem",
    "origin_private_key_pem",
    "docker_registry",
    "docker_registry_username",
    "docker_registry_password",
    "harbor_registry",
    "harbor_registry_username",
    "harbor_registry_password",
    "default_registry",
    "github_client_id",
    "github_client_secret",
    "gitlab_client_id",
    "gitlab_client_secret",
    "default_scm",
    "dns_domains",
    "ssl_provider",
  ];
  let byKey: Record<string, boolean> = {};
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    byKey = Object.fromEntries(rows.map((r) => [r.key, true]));
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021") byKey = {}; // table does not exist yet
    else throw err;
  }
  const status: Record<string, { set: boolean }> = {};
  for (const key of keys) {
    const inDb = !!byKey[key];
    const inEnv = ENV_FALLBACK[key] && process.env[ENV_FALLBACK[key]];
    status[key] = { set: inDb || !!inEnv };
  }
  return status;
}
