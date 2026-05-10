import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#263238",
        mist: "#F6F8F5",
        sage: "#7E9B8F",
        moss: "#425F57",
        clay: "#B86B5A",
        skywash: "#E8F1F2",
        oat: "#F5EEE5"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(38, 50, 56, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
