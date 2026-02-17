import { cookies } from "next/headers";
import { prisma } from "./db";
import { decrypt } from "./encryption";

const SESSION_COOKIE = "dockly_session";

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  const userId = session; // session is userId for MVP
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function getSessionUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, githubId: true, githubLogin: true },
  });
}

export async function getDecryptedGitHubToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { encryptedAccessToken: true },
  });
  if (!user?.encryptedAccessToken) return null;
  try {
    return decrypt(user.encryptedAccessToken);
  } catch {
    return null;
  }
}
