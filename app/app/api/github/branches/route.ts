import { NextResponse } from "next/server";
import { getSessionUserId, getDecryptedGitHubToken } from "@/lib/auth";
import { listBranches } from "@/lib/github";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo"); // owner/repo
  if (!repo) {
    return NextResponse.json({ error: "Missing repo" }, { status: 400 });
  }
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return NextResponse.json({ error: "Invalid repo format" }, { status: 400 });
  }
  const token = await getDecryptedGitHubToken(userId);
  if (!token) {
    return NextResponse.json({ error: "GitHub token not found" }, { status: 400 });
  }
  try {
    const branches = await listBranches(token, owner, repoName);
    return NextResponse.json(branches);
  } catch (e) {
    console.error("List branches error:", e);
    return NextResponse.json({ error: "Failed to list branches" }, { status: 500 });
  }
}
