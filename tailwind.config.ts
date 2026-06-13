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
          base: "#FAF6F0",
          card: "#FFFFFF",
          raised: "#F4EDE3",
          border: "#EAE0D2",
        },
        brand: {
          DEFAULT: "#E5533D",
          dim: "#C8472F",
          soft: "#FCE9E4",
          glow: "#FFD9D0",
        },
        positive: {
          DEFAULT: "#0E9888",
          soft: "#DBF1ED",
        },
        negative: "#E5533D",
        danger: "#DC2626",
        warning: "#D97706",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,26,23,0.04), 0 8px 24px -12px rgba(28,26,23,0.12)",
        glow: "0 6px 16px -8px rgba(229,83,61,0.55)",
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
