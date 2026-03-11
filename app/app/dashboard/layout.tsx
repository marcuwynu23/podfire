import {redirect} from "next/navigation";
import {getSessionUser} from "@/lib/auth";
import {DashboardLayoutClient} from "../../components/DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const displayName = user.githubLogin ?? user.email ?? "Account";

  return (
    <DashboardLayoutClient displayName={displayName}>
      {children}
    </DashboardLayoutClient>
  );
}
