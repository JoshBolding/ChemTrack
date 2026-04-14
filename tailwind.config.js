/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Red Hawk–ish palette
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
        // Ensure minimum tap target of 56px
        tap: '3.5rem', // 56px
      },
      fontSize: {
        // Larger by default for field readability
        base: ['1.0625rem', { lineHeight: '1.5rem' }],
      },
    },
  },
  plugins: [],
};
