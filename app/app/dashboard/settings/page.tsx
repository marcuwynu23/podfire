import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure Cloudflare, certificates, Docker registry, and GitHub. Values are stored encrypted and override .env when set.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
