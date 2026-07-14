import { describe, it, expect } from "vitest";
import { parseRepoUrl } from "./github";

describe("parseRepoUrl", () => {
  it("parses HTTPS URL", () => {
    const result = parseRepoUrl("https://github.com/user/repo");
    expect(result).toEqual({ owner: "user", repo: "repo" });
  });

  it("parses HTTPS URL with .git suffix", () => {
    const result = parseRepoUrl("https://github.com/user/repo.git");
    expect(result).toEqual({ owner: "user", repo: "repo" });
  });

  it("parses HTTPS URL with trailing slash", () => {
    const result = parseRepoUrl("https://github.com/user/repo/");
    expect(result).toEqual({ owner: "user", repo: "repo" });
  });

  it("parses SSH URL", () => {
    const result = parseRepoUrl("git@github.com:user/repo.git");
    expect(result).toEqual({ owner: "user", repo: "repo" });
  });

  it("parses SSH URL without .git suffix", () => {
    const result = parseRepoUrl("git@github.com:user/repo");
    expect(result).toEqual({ owner: "user", repo: "repo" });
  });

  it("returns null for non-GitHub URLs", () => {
    expect(parseRepoUrl("https://gitlab.com/user/repo")).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(parseRepoUrl("not-a-url")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseRepoUrl("")).toBeNull();
  });
});
