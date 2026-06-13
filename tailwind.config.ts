import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          base: "#0A0F1E",
          card: "#111827",
          raised: "#1A2235",
          border: "#1F2D40",
        },
        brand: {
          DEFAULT: "#10B981",
          dim: "#059669",
          glow: "#6EE7B7",
        },
        danger: "#F43F5E",
        warning: "#F59E0B",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 24px 60px -32px rgba(0,0,0,0.65)",
        glow: "0 0 40px rgba(16,185,129,0.16)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.04)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.5s ease-in-out infinite",
        "slide-up": "slide-up 0.25s ease-out",
      },
    },
  },
};

export default config;
