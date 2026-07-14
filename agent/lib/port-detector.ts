import * as fs from "fs";
import * as path from "path";

const PORT_PATTERNS: RegExp[] = [
  /\.listen\((?:\s*\w+\s*,)?\s*['"`]?(\d{2,5})['"`]?\s*[),]/,
  /process\.env\.PORT\s*\|\|\s*['"`]?(\d{2,5})['"`]?/,
  /PORT\s*\|\|\s*['"`]?(\d{2,5})['"`]?/i,
  /port\s*\|\|\s*['"`]?(\d{2,5})['"`]?/i,
  /["'`]PORT["'`]\s*[:=]\s*['"`]?(\d{2,5})['"`]?/i,
  /["'`]port["'`]\s*[:=]\s*['"`]?(\d{2,5})['"`]?/i,
  /--port[= ](\d{2,5})/,
  /["']port["']\s*:\s*(\d{2,5})/,
];

const EXCLUDE_DIRS = new Set([
  "node_modules", "dist", ".next", "build", ".git", "out", ".vercel",
]);

function scanFile(filePath: string): number | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const pattern of PORT_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        const port = parseInt(match[1], 10);
        if (port >= 1024 && port <= 65535) return port;
      }
    }
  } catch {
    // skip unreadable files
  }
  return null;
}

function walkDir(dir: string, depth: number): number | null {
  if (depth > 10) return null;
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry)) continue;
      const result = walkDir(fullPath, depth + 1);
      if (result !== null) return result;
    } else if (stat.isFile()) {
      const ext = path.extname(entry).toLowerCase();
      if (![".js", ".ts", ".mjs", ".cjs", ".mts", ".cts", ".json"].includes(ext)) continue;
      const result = scanFile(fullPath);
      if (result !== null) return result;
    }
  }
  return null;
}

export function detectPortFromSource(repoPath: string): number | null {
  return walkDir(repoPath, 0);
}
