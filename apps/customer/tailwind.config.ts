import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)"],
        display: ["var(--font-display)"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
    },
  },
};

export default config;
