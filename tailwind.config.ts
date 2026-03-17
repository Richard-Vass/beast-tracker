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
        beast: {
          orange: '#FF6B00',
          'orange-light': '#FF8533',
          'orange-dark': '#CC5500',
          bg: '#0a0a0a',
          card: '#111111',
          'card-hover': '#1a1a1a',
          border: '#222222',
          muted: 'rgba(255,255,255,0.5)',
          soft: 'rgba(255,255,255,0.7)',
        },
      },
    },
  },
  plugins: [],
};
export default config;
