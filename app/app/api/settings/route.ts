import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getSettingsStatus, getSetting, setSetting } from "@/lib/settings";

const ALL_KEYS = [
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
  "acme_email",
] as const;

const PUBLIC_KEYS = ["dns_domains", "ssl_provider", "acme_email", "default_registry", "default_scm"] as const;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await getSettingsStatus();
  const values: Record<string, string> = {};
  for (const key of PUBLIC_KEYS) {
    const v = await getSetting(key);
    if (v != null) values[key] = v;
  }
  return NextResponse.json({ settings: status, values });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: Record<string, string>;
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  for (const key of Object.keys(body)) {
    if (!ALL_KEYS.includes(key as (typeof ALL_KEYS)[number])) continue;
    const value = body[key];
    if (typeof value !== "string") continue;
    if (value.trim() === "") {
      const { prisma } = await import("@/lib/db");
      await prisma.setting.deleteMany({ where: { key } });
    } else {
      await setSetting(key, value.trim());
    }
  }
  return NextResponse.json({ ok: true });
}
