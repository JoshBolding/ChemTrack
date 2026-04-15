/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#9b6c2d',
          dark: '#734b17',
          light: '#c9954f',
        },
        ink: {
          DEFAULT: '#16202b',
          soft: '#314052',
          muted: '#667487',
        },
        surface: {
          DEFAULT: '#ffffff',
          alt: '#f7f2e9',
          sunken: '#ede5d7',
        },
      },
      spacing: {
        tap: '3.5rem',
      },
      fontSize: {
        base: ['1.0625rem', { lineHeight: '1.5rem' }],
      },
    },
  },
  plugins: [],
};
