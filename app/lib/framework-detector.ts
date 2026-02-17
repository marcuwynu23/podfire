import * as fs from "fs";
import * as path from "path";

export type Framework =
  | "custom"
  | "nextjs"
  | "vite"
  | "express"
  | "node";

const FRAMEWORK_FILES: Array<{ file: string; framework: Framework }> = [
  { file: "Dockerfile", framework: "custom" },
  { file: "next.config.js", framework: "nextjs" },
  { file: "next.config.mjs", framework: "nextjs" },
  { file: "next.config.ts", framework: "nextjs" },
  { file: "vite.config.js", framework: "vite" },
  { file: "vite.config.ts", framework: "vite" },
  { file: "server.js", framework: "express" },
  { file: "app.js", framework: "express" },
];

export function detectFramework(repoPath: string): Framework {
  for (const { file, framework } of FRAMEWORK_FILES) {
    const full = path.join(repoPath, file);
    if (fs.existsSync(full)) return framework;
  }
  return "node";
}
