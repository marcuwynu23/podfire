import { describe, it, expect } from "vitest";
import { sanitizeForDocker } from "./docker";

describe("sanitizeForDocker", () => {
  it("lowercases the name", () => {
    expect(sanitizeForDocker("MyApp")).toBe("myapp");
  });

  it("replaces non-alphanumeric characters with hyphens", () => {
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
});

describe("useLocalOnly and getImageTag (dynamic import)", () => {
  it("returns local tag when DOCKER_REGISTRY is empty", async () => {
    process.env.DOCKER_REGISTRY = "";
    const mod = await import("./docker");
    expect(mod.useLocalOnly()).toBe(true);
    expect(mod.getImageTag("myapp", "abc123")).toBe("myapp:abc123");
  });

  it("includes registry when DOCKER_REGISTRY is set", async () => {
    process.env.DOCKER_REGISTRY = "registry.io";
    const mod = await import("./docker?v=1");
    expect(mod.useLocalOnly()).toBe(false);
    expect(mod.getImageTag("myapp", "latest")).toBe("registry.io/myapp:latest");
  });
});
