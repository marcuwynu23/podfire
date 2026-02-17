import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AgentsSection } from "../AgentsSection";

export default async function AgentsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  return (
    <div className="w-full">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-white">Agents</h1>
      <AgentsSection />
    </div>
  );
}
