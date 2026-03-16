import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        air: {
          bg: "var(--air-bg)",
          surface: "var(--air-surface)",
          border: "var(--air-border)",
          accent: "var(--air-accent)",
          "accent-end": "var(--air-accent-end)",
          muted: "var(--air-muted)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "air": "1rem",
        "air-lg": "1.5rem",
      },
      boxShadow: {
        air: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "air-md": "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        glow: "0 0 40px -10px rgba(99, 102, 241, 0.25)",
        "glow-sm": "0 0 24px -6px rgba(99, 102, 241, 0.2)",
      },
      backgroundImage: {
        "air-gradient": "linear-gradient(135deg, var(--air-bg) 0%, var(--air-bg-end) 100%)",
        "air-accent": "linear-gradient(135deg, var(--air-accent) 0%, var(--air-accent-end) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
