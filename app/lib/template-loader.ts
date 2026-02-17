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

export function getTemplatePath(framework: Exclude<Framework, "custom">): string {
  const name = TEMPLATE_MAP[framework];
  const full = path.join(TEMPLATES_DIR, name);
  if (!fs.existsSync(full)) {
    throw new Error(`Docker template not found: ${name}`);
  }
  return full;
}

export function copyTemplateToRepo(
  repoPath: string,
  framework: Exclude<Framework, "custom">
): void {
  const src = getTemplatePath(framework);
  const dest = path.join(repoPath, "Dockerfile");
  fs.copyFileSync(src, dest);
}
