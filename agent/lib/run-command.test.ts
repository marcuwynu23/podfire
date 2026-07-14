import { describe, it, expect } from "vitest";
import { runCommand, formatOutput } from "./run-command.js";

describe("runCommand", () => {
  it("runs a command and returns success", () => {
    const result = runCommand("echo hello");
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("hello");
  });

  it("returns failure for invalid command", () => {
    const result = runCommand("nonexistent-command-xyz");
    expect(result.success).toBe(false);
  });

  it("captures stdout", () => {
    const result = runCommand("echo test-output");
    expect(result.stdout).toContain("test-output");
  });
});

describe("formatOutput", () => {
  it("formats stdout", () => {
    const result = { success: true, stdout: "hello", stderr: "", error: undefined };
    expect(formatOutput(result)).toBe("hello");
  });

  it("formats stderr", () => {
    const result = { success: true, stdout: "", stderr: "error msg", error: undefined };
    expect(formatOutput(result)).toBe("error msg");
  });

  it("includes error message", () => {
    const result = { success: false, stdout: "", stderr: "", error: "something went wrong" };
    expect(formatOutput(result)).toBe("Error: something went wrong");
  });

  it("returns fallback for empty output", () => {
    const result = { success: true, stdout: "", stderr: "", error: undefined };
    expect(formatOutput(result)).toBe("(no output)");
  });
});
