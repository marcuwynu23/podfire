import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDecryptedGitHubToken } from "@/lib/auth";
import { listRepos } from "@/lib/github";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getDecryptedGitHubToken(userId);
  if (!token) {
    return NextResponse.json({ error: "GitHub token not found" }, { status: 400 });
  }
  try {
    const repos = await listRepos(token);
    return NextResponse.json(repos);
  } catch (e) {
    console.error("List repos error:", e);
    return NextResponse.json({ error: "Failed to list repositories" }, { status: 500 });
  }
}
