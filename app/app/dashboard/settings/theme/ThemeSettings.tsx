"use client";

import { ThemeSwitch, useTheme } from "@/components/ThemeProvider";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="rounded-native border border-gl-edge bg-gl-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gl-text">Theme</h2>
      <p className="mt-1 text-sm text-gl-text-muted">
        Choose light or dark mode. Preference is saved in this browser.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <ThemeSwitch />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              theme === "light"
                ? "border-primary bg-primary/10 text-primary"
                : "border-gl-edge bg-gl-input-bg text-gl-text-muted hover:text-gl-text"
            }`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              theme === "dark"
                ? "border-primary bg-primary/10 text-primary"
                : "border-gl-edge bg-gl-input-bg text-gl-text-muted hover:text-gl-text"
            }`}
          >
            Dark
          </button>
        </div>
      </div>
    </section>
  );
}
