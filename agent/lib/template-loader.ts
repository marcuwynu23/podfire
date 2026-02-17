import * as fs from "fs";
import * as path from "path";
import type { Framework } from "./framework-detector";

const TEMPLATES_DIR = path.join(process.cwd(), "docker-templates");
const TEMPLATE_MAP: Record<Exclude<Framework, "custom">, string> = {
  nextjs: "nextjs.Dockerfile",
  vite: "vite.Dockerfile",
  express: "express.Dockerfile",
  node: "express.Dockerfile",
};

const DEFAULT_BUILD: Record<Exclude<Framework, "custom">, string> = {
  nextjs: "npm run build 2>/dev/null || npx next build",
  vite: "npm run build 2>/dev/null || npx vite build",
  express: "true",
  node: "true",
};

const DEFAULT_ENTRY_CMD: Record<Exclude<Framework, "custom">, string> = {
  nextjs: '["npx", "next", "start"]',
  vite: '["serve", "-s", "dist", "-l", "0.0.0.0:3000"]',
  express: '["node", "server.js"]',
  node: '["node", "server.js"]',
};

function entryCommandToJson(entry: string): string {
  const trimmed = entry.trim();
  if (!trimmed) return '["node", "server.js"]';
  const parts = trimmed.split(/\s+/).map((p) => p.replace(/^["']|["']$/g, ""));
  return JSON.stringify(parts);
}

export function getTemplatePath(framework: Exclude<Framework, "custom">): string {
  const name = TEMPLATE_MAP[framework];
  const full = path.join(TEMPLATES_DIR, name);
  if (!fs.existsSync(full)) throw new Error(`Docker template not found: ${name}`);
  return full;
}

export type TemplateOptions = {
  buildCommand?: string | null;
  entryCommand?: string | null;
};

export function copyTemplateToRepo(
  repoPath: string,
  framework: Exclude<Framework, "custom">,
  options?: TemplateOptions
): void {
  const src = getTemplatePath(framework);
  let content = fs.readFileSync(src, "utf-8");
  const buildCmd = options?.buildCommand?.trim() || DEFAULT_BUILD[framework];
  const entryCmd = options?.entryCommand?.trim()
    ? entryCommandToJson(options.entryCommand)
    : DEFAULT_ENTRY_CMD[framework];

  if (content.includes("__BUILD_RUN__")) {
    const runLine = buildCmd === "true" ? "RUN true" : `RUN ${buildCmd}`;
    content = content.replace("__BUILD_RUN__", runLine);
  }
  if (content.includes("__BUILD_COMMAND__")) {
    content = content.replace("__BUILD_COMMAND__", buildCmd);
  }
  if (content.includes("__ENTRY_CMD__")) {
    content = content.replace("__ENTRY_CMD__", entryCmd);
  }
  fs.writeFileSync(path.join(repoPath, "Dockerfile"), content);
}
