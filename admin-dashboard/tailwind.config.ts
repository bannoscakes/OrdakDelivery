import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        'ordak-blue': {
          primary: '#2E5EAA',
          light: '#4A7BC8',
          dark: '#1E3A6B',
        },
        // Success
        'ordak-green': {
          primary: '#52C41A',
          light: '#73D13D',
          dark: '#389E0D',
        },
        // Warning
        'ordak-orange': {
          primary: '#FAAD14',
          light: '#FFC53D',
          dark: '#D48806',
        },
        // Error
        'ordak-red': {
          primary: '#F5222D',
          light: '#FF4D4F',
          dark: '#CF1322',
        },
        // Neutral
        'ordak-gray': {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E8E8E8',
          400: '#BFBFBF',
          600: '#8C8C8C',
          800: '#262626',
          900: '#141414',
        },
        // Status
        'ordak-status': {
          online: '#52C41A',
          busy: '#FAAD14',
          offline: '#8C8C8C',
          late: '#F5222D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
    },
  },
  plugins: [],
} satisfies Config
