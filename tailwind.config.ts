import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["\"Space Grotesk\"", "ui-sans-serif", "system-ui"],
        body: ["\"IBM Plex Sans\"", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
