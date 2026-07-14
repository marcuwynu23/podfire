import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { detectFramework } from "./framework-detector.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fw-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(name: string, content = "") {
  fs.writeFileSync(path.join(tmpDir, name), content);
}

describe("detectFramework", () => {
  it("detects nextjs from next.config.js", () => {
    writeFile("next.config.js");
    expect(detectFramework(tmpDir)).toBe("nextjs");
  });

  it("detects nextjs from next.config.mjs", () => {
    writeFile("next.config.mjs");
    expect(detectFramework(tmpDir)).toBe("nextjs");
  });

  it("detects nextjs from next.config.ts", () => {
    writeFile("next.config.ts");
    expect(detectFramework(tmpDir)).toBe("nextjs");
  });

  it("detects vite from vite.config.ts", () => {
    writeFile("vite.config.ts");
    expect(detectFramework(tmpDir)).toBe("vite");
  });

  it("detects vite from vite.config.js", () => {
    writeFile("vite.config.js");
    expect(detectFramework(tmpDir)).toBe("vite");
  });

  it("detects express from server.js", () => {
    writeFile("server.js");
    expect(detectFramework(tmpDir)).toBe("express");
  });

  it("detects express from app.js", () => {
    writeFile("app.js");
    expect(detectFramework(tmpDir)).toBe("express");
  });

  it("detects custom when Dockerfile exists", () => {
    writeFile("Dockerfile");
    expect(detectFramework(tmpDir)).toBe("custom");
  });

  it("favors Dockerfile over other indicators", () => {
    writeFile("Dockerfile");
    writeFile("next.config.js");
    expect(detectFramework(tmpDir)).toBe("custom");
  });

  it("returns node when no framework file is found", () => {
    writeFile("random.txt");
    expect(detectFramework(tmpDir)).toBe("node");
  });

  it("returns node for empty directory", () => {
    expect(detectFramework(tmpDir)).toBe("node");
  });
});
