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
        brand: {
          50: '#fff8f1',
          100: '#feeedc',
          200: '#fcd9b6',
          300: '#f9bd84',
          400: '#f5984c',
          500: '#f0741e',
          600: '#e15814',
          700: '#ba4113',
          800: '#943517',
          900: '#772d17',
          950: '#40140a',
        },
      },
    },
  },
  plugins: [],
};
export default config;
