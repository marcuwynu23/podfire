/**
 * GitHub OAuth and API helpers: auth, repos, branches, and commit SHA for auto-deploy.
 */
const GITHUB_API = "https://api.github.com";
const GITHUB_OAUTH = "https://github.com/login/oauth";

export async function isGitHubOAuthConfigured(): Promise<boolean> {
  const id = process.env.GITHUB_CLIENT_ID;
  const secret = process.env.GITHUB_CLIENT_SECRET;
  return Boolean(id?.trim() && secret?.trim());
}

export async function getOAuthAuthorizeUrl(): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID!;
  const callback = process.env.GITHUB_CALLBACK_URL ?? "http://localhost:3000/api/github/callback";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback,
    scope: "read:user user:email repo",
  });
  return `${GITHUB_OAUTH}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch(`${GITHUB_OAUTH}/access_token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.GITHUB_CALLBACK_URL ?? "http://localhost:3000/api/github/callback",
    }),
  });
  if (!res.ok) throw new Error("GitHub token exchange failed");
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (data.error) throw new Error(data.error);
  if (!data.access_token) throw new Error("No access token in response");
  return data.access_token;
}

export type GhUser = { id: number; login: string; email?: string | null; avatar_url?: string };

export async function getAuthenticatedUser(accessToken: string): Promise<GhUser> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error("Failed to get GitHub user");
  return res.json();
}

export type RepoItem = { id: number; full_name: string; clone_url: string; default_branch: string };

export async function listRepos(accessToken: string): Promise<RepoItem[]> {
  const res = await fetch(`${GITHUB_API}/user/repos?per_page=100&sort=updated`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error("Failed to list repos");
  const data = (await res.json()) as Array<{ id: number; full_name: string; clone_url: string; default_branch: string }>;
  return data.map((r) => ({ id: r.id, full_name: r.full_name, clone_url: r.clone_url, default_branch: r.default_branch ?? "main" }));
}

export type BranchItem = { name: string };

export async function listBranches(accessToken: string, owner: string, repo: string): Promise<BranchItem[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (!res.ok) throw new Error("Failed to list branches");
  const data = (await res.json()) as Array<{ name: string }>;
  return data.map((b) => ({ name: b.name }));
}

/**
 * Parse repo URL to owner and repo name.
 * Supports https://github.com/owner/repo, https://github.com/owner/repo.git, git@github.com:owner/repo.git.
 */
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const u = repoUrl.trim();
  const gitMatch = u.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (gitMatch) return { owner: gitMatch[1], repo: gitMatch[2].replace(/\.git$/, "") };
  const httpsMatch = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+?)(?:\.git)?\/?$/i);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, "") };
  return null;
}

/**
 * Fetch the latest commit SHA on the given branch.
 * Uses GitHub API with optional token for private repos and higher rate limits.
 */
export async function getLatestCommitSha(
  repoUrl: string,
  branch: string,
  token?: string | null
): Promise<string | null> {
  const info = await getLatestCommitInfo(repoUrl, branch, token);
  return info?.sha ?? null;
}

export type LatestCommitInfo = { sha: string; message: string };

/**
 * Fetch the latest commit SHA and message on the given branch.
 */
export async function getLatestCommitInfo(
  repoUrl: string,
  branch: string,
  token?: string | null
): Promise<LatestCommitInfo | null> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return null;
  const { owner, repo } = parsed;
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=1`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "dockly-auto-deploy",
  };
  if (token) headers.Authorization = `token ${token}`;
  try {
    const res = await fetch(url, { headers, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ sha?: string; commit?: { message?: string } }>;
    const first = Array.isArray(data) && data[0] ? data[0] : null;
    if (!first?.sha) return null;
    const message = first.commit?.message?.trim().split("\n")[0] ?? "";
    return { sha: first.sha, message };
  } catch {
    return null;
  }
}
