import { describe, it, expect } from "vitest";
import { generateStackYaml, sanitizeStackName } from "./stack";

describe("sanitizeStackName", () => {
  it("delegates to sanitizeForDocker", () => {
    expect(sanitizeStackName("My App")).toBe("my-app");
  });
});

describe("generateStackYaml", () => {
  it("generates basic YAML with defaults", () => {
    const yaml = generateStackYaml("myapp", "myapp:latest", 80);
    expect(yaml).toContain("image: myapp:latest");
    expect(yaml).toContain("myapp.localhost");
    expect(yaml).toContain("loadbalancer.server.port=80");
  });

  it("includes custom port", () => {
    const yaml = generateStackYaml("myapp", "img:1", 5000);
    expect(yaml).toContain("loadbalancer.server.port=5000");
  });

  it("uses domain instead of localhost", () => {
    const yaml = generateStackYaml("myapp", "img:1", 80, "example.com");
    expect(yaml).toContain("myapp.example.com");
    expect(yaml).not.toContain("myapp.localhost");
  });

  it("sanitizes stack name", () => {
    const yaml = generateStackYaml("My App!", "img:1", 3000);
    expect(yaml).toContain("my-app.localhost");
  });
});
