import type { Config } from 'tailwindcss'

// Note: In Tailwind v4, colors are defined in the @theme block in src/index.css
// This config is kept minimal - it provides content paths and any non-CSS config
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
