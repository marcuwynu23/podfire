import { spawn, spawnSync } from "child_process";

export type RunResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
};

export function runCommand(
  command: string,
  options: { cwd?: string; shell?: boolean } = {}
): RunResult {
  const { cwd, shell = true } = options;
  const result = spawnSync(command, {
    shell: shell ?? true,
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  return {
    success: result.status === 0,
    stdout,
    stderr,
    ...(result.error?.message && { error: result.error.message }),
  };
}

/** Stream command output line-by-line; resolves with success when process exits. */
export function runCommandStream(
  command: string,
  onLine: (line: string) => void,
  options: { cwd?: string; shell?: boolean } = {}
): Promise<{ success: boolean; exitCode: number | null }> {
  const { cwd, shell = true } = options;
  return new Promise((resolve) => {
    const proc = spawn(command, [], {
      shell: shell ?? true,
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const emit = (chunk: string, stream: "stdout" | "stderr") => {
      const lines = chunk.split(/\r?\n/).filter((s) => s.length > 0);
      for (const line of lines) onLine(line);
    };
    proc.stdout?.setEncoding("utf8").on("data", (chunk: string) => emit(chunk, "stdout"));
    proc.stderr?.setEncoding("utf8").on("data", (chunk: string) => emit(chunk, "stderr"));
    proc.on("close", (code, _signal) => {
      resolve({ success: code === 0, exitCode: code });
    });
    proc.on("error", (err) => {
      onLine(`Error: ${err.message}`);
      resolve({ success: false, exitCode: null });
    });
  });
}

export function formatOutput(r: RunResult): string {
  const parts: string[] = [];
  if (r.stdout) parts.push(r.stdout);
  if (r.stderr) parts.push(r.stderr);
  if (r.error) parts.push(`Error: ${r.error}`);
  return parts.join("\n").trim() || "(no output)";
}
