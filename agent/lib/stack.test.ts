import { describe, it, expect } from "vitest";
import { generateStackYaml, sanitizeStackName } from "./stack.js";

describe("sanitizeStackName", () => {
  it("sanitizes a name", () => {
    expect(sanitizeStackName("My App")).toBe("my-app");
  });
});

describe("generateStackYaml", () => {
  it("generates basic YAML with defaults", () => {
    const yaml = generateStackYaml("myapp", "myapp:latest", 80);
    expect(yaml).toContain("image: myapp:latest");
    expect(yaml).toContain("myapp.localhost");
    expect(yaml).toContain("replicas: 1");
    expect(yaml).not.toContain("environment:");
    expect(yaml).not.toContain("resources:");
  });

  it("includes custom port in Traefik label", () => {
    const yaml = generateStackYaml("myapp", "img:1", 5000);
    expect(yaml).toContain("loadbalancer.server.port=5000");
  });

  it("uses the correct hostname with domain", () => {
    const yaml = generateStackYaml("myapp", "img:1", 80, { domain: "example.com" });
    expect(yaml).toContain("myapp.example.com");
    expect(yaml).not.toContain("myapp.localhost");
  });

  it("includes environment variables", () => {
    const yaml = generateStackYaml("myapp", "img:1", 80, {
      env: { PORT: "8080", NODE_ENV: "production" },
    });
    expect(yaml).toContain("environment:");
    expect(yaml).toContain("PORT: 8080");
    expect(yaml).toContain("NODE_ENV: production");
  });

  it("limits replicas to 32", () => {
    const yaml = generateStackYaml("myapp", "img:1", 80, { replicas: 100 });
    expect(yaml).toContain("replicas: 32");
  });

  it("ensures at least 1 replica", () => {
    const yaml = generateStackYaml("myapp", "img:1", 80, { replicas: 0 });
    expect(yaml).toContain("replicas: 1");
  });

  it("includes CPU limit", () => {
    const yaml = generateStackYaml("myapp", "img:1", 80, { cpuLimit: "1.5" });
    expect(yaml).toContain('cpus: "1.5"');
  });

  it("includes memory limit", () => {
    const yaml = generateStackYaml("myapp", "img:1", 80, { memoryLimit: "512m" });
    expect(yaml).toContain("memory: 512m");
  });

  it("includes both CPU and memory limits", () => {
    const yaml = generateStackYaml("myapp", "img:1", 80, {
      cpuLimit: "2",
      memoryLimit: "1g",
    });
    expect(yaml).toContain('cpus: "2"');
    expect(yaml).toContain("memory: 1g");
  });

  it("sanitizes stack name in labels and host", () => {
    const yaml = generateStackYaml("My App!", "img:1", 3000);
    expect(yaml).toContain("my-app.localhost");
    expect(yaml).toContain("traefik.http.routers.my-app");
  });
});
