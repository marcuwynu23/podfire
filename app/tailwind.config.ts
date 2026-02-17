import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-ubuntu)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#10b981",
        "primary-hover": "#059669",
        "gl-bg": "#1a1a1c",
        "gl-sidebar": "#1e1e20",
        "gl-card": "#222224",
        "gl-edge": "#2a2a2c",
      },
      boxShadow: {},
      borderRadius: {
        native: "16px",
        "native-sm": "10px",
      },
    },
  },
  plugins: [],
};
export default config;
