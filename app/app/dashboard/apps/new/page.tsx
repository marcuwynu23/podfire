import Link from "next/link";
import { CreateAppForm } from "./CreateAppForm";

export default function NewAppPage() {
  return (
    <div className="w-full max-w-none">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard/apps"
          className="text-sm text-gl-text-muted transition hover:text-primary"
        >
          ← Back to Apps
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gl-text sm:text-3xl">
          Create App
        </h1>
        <p className="mt-1 text-sm text-gl-text-muted">
          Connect a GitHub repo and configure your deployment.
        </p>
      </div>
      <CreateAppForm cancelHref="/dashboard/apps" contained />
    </div>
  );
}
