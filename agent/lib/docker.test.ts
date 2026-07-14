import { describe, it, expect } from "vitest";
import { sanitizeForDocker, detectExposedPort } from "./docker.js";

describe("sanitizeForDocker", () => {
  it("lowercases the name", () => {
    expect(sanitizeForDocker("MyApp")).toBe("myapp");
  });

  it("replaces non-alphanumeric characters with hyphens and trims edges", () => {
    expect(sanitizeForDocker("hello world!")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(sanitizeForDocker("a---b")).toBe("a-b");
  });

  it("trims leading and trailing hyphens", () => {
    expect(sanitizeForDocker("-app-")).toBe("app");
  });

  it("returns 'app' for empty string after sanitization", () => {
    expect(sanitizeForDocker("!@#$")).toBe("app");
  });

  it("handles mixed case and special chars", () => {
    expect(sanitizeForDocker("My_Cool-App_v2.0")).toBe("my-cool-app-v2-0");
  });

  it("preserves valid hyphens", () => {
    expect(sanitizeForDocker("my-app")).toBe("my-app");
  });
});

describe("detectExposedPort", () => {
  it("returns null when docker command fails", () => {
    const port = detectExposedPort("nonexistent-image:latest");
    expect(port).toBeNull();
  });
});

describe("useLocalOnly and getImageTag (dynamic import to control env)", () => {
  it("returns local tag when DOCKER_REGISTRY is empty", async () => {
    process.env.DOCKER_REGISTRY = "";
    const mod = await import("./docker.js");
    expect(mod.useLocalOnly()).toBe(true);
    expect(mod.getImageTag("myapp", "abc123")).toBe("myapp:abc123");
  });

  it("includes registry when DOCKER_REGISTRY is set", async () => {
    process.env.DOCKER_REGISTRY = "registry.io";
    const mod = await import("./docker.js?version=2");
    expect(mod.useLocalOnly()).toBe(false);
    expect(mod.getImageTag("myapp", "latest")).toBe("registry.io/myapp:latest");
  });

  it("trims whitespace from registry value", async () => {
    process.env.DOCKER_REGISTRY = "  myregistry.io  ";
    const mod = await import("./docker.js?version=3");
    expect(mod.useLocalOnly()).toBe(false);
  });

  it("sanitizes the service name in tag", async () => {
    process.env.DOCKER_REGISTRY = "";
    const mod = await import("./docker.js?version=4");
    expect(mod.getImageTag("My App!", "v1")).toBe("my-app:v1");
  });
});
