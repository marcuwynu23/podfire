import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  return (
    <div className="w-full">
      <Link
        href="/dashboard"
        className="text-sm text-gl-text-muted transition hover:text-gl-text"
      >
        ← Overview
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gl-text sm:text-3xl">
        Settings
      </h1>
      <p className="mt-1 mb-6 text-sm text-gl-text-muted">
        User profile and theme. For gateway, Cloudflare, GitHub, and registry
        configuration, use{" "}
        <Link
          href="/dashboard/admin-settings"
          className="text-primary hover:underline"
        >
          Admin settings
        </Link>
        .
      </p>
      <div className="max-w-3xl">
        <SettingsForm user={user} />
      </div>
    </div>
  );
}
