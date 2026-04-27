import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          50: "#f6f6f5",
          100: "#e9e9e7",
          200: "#cfcfcb",
          300: "#a8a8a2",
          400: "#76766f",
          500: "#53534c",
          600: "#3b3b36",
          700: "#2a2a26",
          800: "#1b1b18",
          850: "#151513",
          900: "#0f0f0d",
          950: "#09090a",
        },
        accent: {
          purple: "#833ab4",
          pink: "#fd1d1d",
          orange: "#fcb045",
        },
      },
      boxShadow: {
        editorial: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "ig-gradient":
          "linear-gradient(135deg, #833ab4 0%, #fd1d1d 55%, #fcb045 100%)",
      },
      letterSpacing: { editorial: "-0.02em" },
    },
  },
  plugins: [],
};
export default config;
