import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "bg-fire",
    "text-fire",
    "border-fire",
    "btn-fire",
    "btn-fire-outline",
    "btn-fire-ghost",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-ubuntu)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#ea580c",
        "primary-hover": "#c2410c",
        brand: "#f97316",
        "brand-muted": "#a3a3a3",
        "gl-bg": "var(--gl-bg)",
        "gl-sidebar": "var(--gl-sidebar)",
        "gl-card": "var(--gl-card)",
        "gl-card-hover": "var(--gl-card-hover)",
        "gl-edge": "var(--gl-edge)",
        "gl-text": "var(--gl-text)",
        "gl-text-muted": "var(--gl-text-muted)",
        "gl-input-bg": "var(--gl-input-bg)",
        "gl-overlay": "var(--gl-overlay)",
        "gl-hover": "var(--gl-hover)",
      },
      boxShadow: {
        primary: "0 1px 3px rgba(234, 88, 12, 0.25)",
        "primary-md": "0 4px 12px rgba(234, 88, 12, 0.3)",
      },
      borderRadius: {
        native: "16px",
        "native-sm": "10px",
      },
    },
  },
  plugins: [],
};
export default config;
