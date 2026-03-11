import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import * as fs from "fs";
import * as path from "path";

type DomainRow = { domain: string; ssl?: string };

function hasLetsEncryptDomain(dnsDomainsJson: string | null): boolean {
  if (!dnsDomainsJson?.trim()) return false;
  try {
    const parsed = JSON.parse(dnsDomainsJson) as unknown;
    if (!Array.isArray(parsed)) return false;
    return parsed.some((item: unknown) => {
      if (item && typeof item === "object" && "ssl" in item)
        return (item as DomainRow).ssl === "letsencrypt";
      return false;
    });
  } catch {
    return false;
  }
}

/** Build Traefik stack YAML with optional HTTPS (Let's Encrypt) when DNS settings have ssl=letsencrypt. */
function buildTraefikYaml(baseYaml: string, acmeEmail: string): string {
  const entrypointWeb = "- --entrypoints.web.address=:80";
  if (!baseYaml.includes(entrypointWeb)) return baseYaml;

  const extraCommand = [
    "\n      - --entrypoints.websecure.address=:443",
    "\n      - --certificatesresolvers.letsencrypt.acme.email=" + acmeEmail,
    "\n      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json",
    "\n      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web",
  ].join("");

  let out = baseYaml.replace(entrypointWeb, entrypointWeb + extraCommand);

  const port80Block = "      - target: 80\n        published: 80\n        mode: host";
  const port443Block = "\n      - target: 443\n        published: 443\n        mode: host";
  if (out.includes(port80Block) && !out.includes("published: 443")) {
    out = out.replace(port80Block, port80Block + port443Block);
  }

  if (!out.includes("letsencrypt")) {
    out = out.replace(
      "    networks:\n      - web\n    deploy:",
      "    networks:\n      - web\n    volumes:\n      - letsencrypt:/letsencrypt\n    deploy:"
    );
    out = out.replace(
      "networks:\n  web:\n    external: true",
      "volumes:\n  letsencrypt:\n\nnetworks:\n  web:\n    external: true"
    );
  }
  return out;
}

/** Build Traefik stack YAML (base + optional HTTPS from DNS settings). Used by config GET and deploy. */
export async function getTraefikConfigYaml(): Promise<string> {
  const stackPath = path.join(process.cwd(), "traefik", "traefik-stack.yml");
  let yaml = fs.readFileSync(stackPath, "utf-8");
  const dnsDomains = await getSetting("dns_domains");
  const acmeEmail =
    (await getSetting("acme_email")) || process.env.TRAEFIK_ACME_EMAIL || "admin@example.com";
  if (hasLetsEncryptDomain(dnsDomains ?? null)) {
    yaml = buildTraefikYaml(yaml, acmeEmail);
  }
  return yaml;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const yaml = await getTraefikConfigYaml();
    return NextResponse.json({ yaml });
  } catch {
    return NextResponse.json(
      { error: "Traefik stack file not found", yaml: "" },
      { status: 200 }
    );
  }
}
