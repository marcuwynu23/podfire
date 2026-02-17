import { NextResponse } from "next/server";
import { getOAuthAuthorizeUrl, isGitHubOAuthConfigured } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isGitHubOAuthConfigured())) {
    const url = new URL("/", request.url);
    url.searchParams.set("error", "oauth_not_configured");
    return NextResponse.redirect(url);
  }
  const authUrl = await getOAuthAuthorizeUrl();
  return NextResponse.redirect(authUrl);
}
