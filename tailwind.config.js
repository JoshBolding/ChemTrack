/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#b8202e',
          dark: '#8a1822',
          light: '#d94652',
        },
        ink: {
          DEFAULT: '#0f172a',
          soft: '#334155',
          muted: '#64748b',
        },
        surface: {
          DEFAULT: '#ffffff',
          alt: '#f8fafc',
          sunken: '#f1f5f9',
        },
      },
      spacing: {
        tap: '3.5rem',
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
      },
    },
  },
  plugins: [],
};
