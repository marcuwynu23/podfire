import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  return (
    <div className="w-full">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 transition hover:text-white"
      >
        ← Overview
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Settings
      </h1>
      <p className="mt-1 mb-6 text-sm text-zinc-400">
        Configure Cloudflare, certificates, Docker registry, and GitHub. Values are stored encrypted and override .env when set.
      </p>
      <div className="max-w-3xl">
        <SettingsForm />
      </div>
    </div>
  );
}
