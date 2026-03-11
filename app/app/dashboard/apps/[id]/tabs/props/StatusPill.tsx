export function StatusPill({ status }: { status: string }) {
  const s = status === "—" ? "idle" : status;
  const styles: Record<string, string> = {
    running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    stopped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
    building: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    pushing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    deploying: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    queued: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    idle: "bg-zinc-500/10 text-gl-text-muted border-gl-edge",
  };
  const style = styles[s] ?? styles.idle;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${style}`}
    >
      {s === "idle" ? "No deployment" : s}
    </span>
  );
}
