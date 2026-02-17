import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, getAuthenticatedUser } from "@/lib/github";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL("/?error=github_denied", request.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }
  try {
    const accessToken = await exchangeCodeForToken(code);
    const ghUser = await getAuthenticatedUser(accessToken);
    const encryptedToken = encrypt(accessToken);
    const user = await prisma.user.upsert({
      where: { githubId: String(ghUser.id) },
      create: {
        githubId: String(ghUser.id),
        githubLogin: ghUser.login ?? null,
        email: ghUser.email ?? null,
        encryptedAccessToken: encryptedToken,
      },
      update: {
        githubLogin: ghUser.login ?? null,
        email: ghUser.email ?? null,
        encryptedAccessToken: encryptedToken,
      },
    });
    const cookieStore = await cookies();
    cookieStore.set("dockly_session", user.id, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (e) {
    console.error("GitHub callback error:", e);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
