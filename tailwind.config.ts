import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF7",
        ink: "#14181F",
        muted: "#5B6472",
        line: "#E4E1DA",
        pine: {
          DEFAULT: "#2F5D50",
          dark: "#213F37",
          light: "#EAF1EE",
        },
        gold: {
          DEFAULT: "#B8862E",
          light: "#F6EEDD",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
