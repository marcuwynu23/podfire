"use client";

import { useState } from "react";

export function AccordionSection({
  id,
  title,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-section={id}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-3 text-left transition hover:bg-gl-input-bg/50"
        aria-expanded={open}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
      >
        <span className="text-sm font-medium text-gl-text">{title}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gl-text-muted transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div id={`${id}-content`} role="region" aria-labelledby={`${id}-header`} className="pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
