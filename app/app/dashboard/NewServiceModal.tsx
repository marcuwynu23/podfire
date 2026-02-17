"use client";

import { useState } from "react";
import { CreateServiceForm } from "./services/new/CreateServiceForm";

export function NewServiceModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-zinc-400 hover:text-white"
      >
        New service
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-service-title"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-2xl rounded-native border border-white/[0.06] bg-gl-card shadow-sm">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <h2 id="new-service-title" className="text-lg font-semibold text-white">
                Create service
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <CreateServiceForm
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
                showCancelLink={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
