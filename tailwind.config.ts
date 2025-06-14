import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px -> 18px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px -> 21px
        'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px -> 24px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px -> 27px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px -> 30px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px -> 36px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px -> 45px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px -> 54px
        '5xl': ['3rem', { lineHeight: '1' }],            // 48px -> 72px
        '6xl': ['3.75rem', { lineHeight: '1' }],         // 60px -> 90px
        '7xl': ['4.5rem', { lineHeight: '1' }],          // 72px -> 108px
        '8xl': ['6rem', { lineHeight: '1' }],            // 96px -> 144px
        '9xl': ['8rem', { lineHeight: '1' }],            // 128px -> 192px
      },
    },
  },
  plugins: [],
} satisfies Config;
