import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { detectPortFromSource } from "./port-detector.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "port-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(name: string, content: string) {
  const full = path.join(tmpDir, name);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

describe("detectPortFromSource", () => {
  it("returns null for empty directory", () => {
    expect(detectPortFromSource(tmpDir)).toBeNull();
  });

  it("detects port from app.listen(5000)", () => {
    writeFile("server.ts", `app.listen(5000);`);
    expect(detectPortFromSource(tmpDir)).toBe(5000);
  });

  it("detects port from process.env.PORT || 3000", () => {
    writeFile("index.js", `const port = process.env.PORT || 3000;`);
    expect(detectPortFromSource(tmpDir)).toBe(3000);
  });

  it("detects port from PORT || 8080", () => {
    writeFile("app.ts", `const p = PORT || 8080;`);
    expect(detectPortFromSource(tmpDir)).toBe(8080);
  });

  it("detects port from port || 9000", () => {
    writeFile("main.js", `const p = port || 9000;`);
    expect(detectPortFromSource(tmpDir)).toBe(9000);
  });

  it("detects port from \"PORT\": 4000 in JSON", () => {
    writeFile("config.json", `{ "PORT": 4000 }`);
    expect(detectPortFromSource(tmpDir)).toBe(4000);
  });

  it("detects port from --port 3001", () => {
    writeFile("script.ts", `--port 3001`);
    expect(detectPortFromSource(tmpDir)).toBe(3001);
  });

  it("returns null for ports below 1024", () => {
    writeFile("server.js", `app.listen(80);`);
    expect(detectPortFromSource(tmpDir)).toBeNull();
  });

  it("returns null for ports above 65535", () => {
    writeFile("server.js", `app.listen(70000);`);
    expect(detectPortFromSource(tmpDir)).toBeNull();
  });

  it("skips node_modules directory", () => {
    writeFile("node_modules/server.js", `app.listen(5000);`);
    expect(detectPortFromSource(tmpDir)).toBeNull();
  });

  it("skips dist directory", () => {
    writeFile("dist/server.js", `app.listen(5000);`);
    expect(detectPortFromSource(tmpDir)).toBeNull();
  });

  it("skips .next directory", () => {
    writeFile(".next/server.js", `app.listen(5000);`);
    expect(detectPortFromSource(tmpDir)).toBeNull();
  });

  it("detects port from nested source file", () => {
    writeFile("src/server.ts", `const port = process.env.PORT || 8080;`);
    expect(detectPortFromSource(tmpDir)).toBe(8080);
  });

  it("returns the first port found in depth-first order", () => {
    writeFile("a.js", `app.listen(3000);`);
    writeFile("b.js", `app.listen(4000);`);
    expect(detectPortFromSource(tmpDir)).toBe(3000);
  });
});
