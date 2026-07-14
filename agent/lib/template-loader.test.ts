import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { copyTemplateToRepo, getTemplatePath } from "./template-loader.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tmpl-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("getTemplatePath", () => {
  it("returns a path for express template", () => {
    const p = getTemplatePath("express");
    expect(p).toContain("express.Dockerfile");
    expect(fs.existsSync(p)).toBe(true);
  });

  it("returns a path for nextjs template", () => {
    const p = getTemplatePath("nextjs");
    expect(p).toContain("nextjs.Dockerfile");
    expect(fs.existsSync(p)).toBe(true);
  });

  it("returns a path for vite template", () => {
    const p = getTemplatePath("vite");
    expect(p).toContain("vite.Dockerfile");
    expect(fs.existsSync(p)).toBe(true);
  });

  it("maps node to express template", () => {
    const p = getTemplatePath("node");
    expect(p).toContain("express.Dockerfile");
  });
});

describe("copyTemplateToRepo", () => {
  it("writes a Dockerfile for express framework", () => {
    copyTemplateToRepo(tmpDir, "express");
    const dockerfile = path.join(tmpDir, "Dockerfile");
    expect(fs.existsSync(dockerfile)).toBe(true);
    const content = fs.readFileSync(dockerfile, "utf-8");
    expect(content).toContain("EXPOSE 3000");
    expect(content).toContain('CMD ["node", "server.js"]');
  });

  it("writes a Dockerfile for nextjs framework", () => {
    copyTemplateToRepo(tmpDir, "nextjs");
    const content = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
    expect(content).toContain("EXPOSE 3000");
    expect(content).toContain('CMD ["npx", "next", "start"]');
  });

  it("writes a Dockerfile for vite framework", () => {
    copyTemplateToRepo(tmpDir, "vite");
    const content = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
    expect(content).toContain("EXPOSE 3000");
    expect(content).toContain('CMD ["serve"');
  });

  it("substitutes build command in vite template", () => {
    copyTemplateToRepo(tmpDir, "vite", { buildCommand: "npm run custom:build" });
    const content = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
    expect(content).toContain("npm run custom:build");
  });

  it("substitutes entry command in express template", () => {
    copyTemplateToRepo(tmpDir, "express", { entryCommand: "node index.js" });
    const content = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
    expect(content).toContain('CMD ["node","index.js"]');
  });

  it("substitutes output directory in vite template", () => {
    copyTemplateToRepo(tmpDir, "vite", { outputDirectory: "build" });
    const content = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
    expect(content).toContain('["serve","-s","build","-l","0.0.0.0:3000"]');
  });

  it("maps node framework to express template", () => {
    copyTemplateToRepo(tmpDir, "node");
    const content = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
    expect(content).toContain('CMD ["node", "server.js"]');
  });
});
