/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#818cf8',
          muted: 'rgba(99, 102, 241, 0.12)',
        },
        primary: {
          DEFAULT: '#f1f5f9',
          dark: '#0f172a',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1e293b',
        },
        content: {
          primary: '#0f172a',
          secondary: '#475569',
          muted: '#94a3b8',
        },
        border: {
          DEFAULT: '#e2e8f0',
          dark: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        bubble: '1.25rem',
        card: '1rem',
        'input': '0.75rem',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(0, 0, 0, 0.06)',
        'soft-dark': '0 2px 12px rgba(0, 0, 0, 0.25)',
        'bubble': '0 1px 2px rgba(0, 0, 0, 0.06)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.06)',
        'card-dark': '0 4px 20px rgba(0, 0, 0, 0.2)',
      },
      transitionDuration: {
        '150': '150ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
