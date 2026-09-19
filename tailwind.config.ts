import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}","./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#120504",
        ink: "#FFF5E9",
        muted: "#BDA7A0",
        line: "rgba(255,245,233,.12)",
        pine: { DEFAULT:"#C63F4C", dark:"#3A0D11", light:"#2A0E10" },
        gold: { DEFAULT:"#D8E06B", light:"#3A3C18" },
      },
      fontFamily: {
        display: ["var(--font-display)","serif"],
        body: ["var(--font-body)","sans-serif"],
      },
      maxWidth: { content:"72rem" },
    },
  },
  plugins: [],
};

export default config;