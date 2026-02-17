import { spawnSync } from "child_process";

export type RunResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
};

/**
 * Run a shell command and capture stdout/stderr for logging.
 */
export function runCommand(
  command: string,
  options: { cwd?: string; shell?: boolean } = {}
): RunResult {
  const { cwd, shell = true } = options;
  const result = spawnSync(command, {
    shell: shell ?? true,
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024, // 10MB
  });
  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  const success = result.status === 0;
  const error = result.error?.message;
  return {
    success,
    stdout,
    stderr,
    ...(error && { error }),
  };
}

/** Format captured output for logs (stdout + stderr). */
export function formatOutput(r: RunResult): string {
  const parts: string[] = [];
  if (r.stdout) parts.push(r.stdout);
  if (r.stderr) parts.push(r.stderr);
  if (r.error) parts.push(`Error: ${r.error}`);
  return parts.join("\n").trim() || "(no output)";
}
