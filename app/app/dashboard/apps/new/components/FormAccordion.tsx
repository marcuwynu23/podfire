"use client";

export function FormAccordion({
  title,
  open,
  onToggle,
  children,
  className = "",
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-gl-text hover:bg-gl-hover transition"
        aria-expanded={open}
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gl-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gl-edge px-4 pb-4 pt-2 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
