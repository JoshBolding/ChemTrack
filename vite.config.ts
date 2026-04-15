import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages deploys under /ChemTrack/ — set base accordingly in prod.
const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: isProd ? '/ChemTrack/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ChemTrack',
        short_name: 'ChemTrack',
        description: 'Field chemical tote tracking for units, yards, and jobs',
        theme_color: '#12161c',
        background_color: '#12161c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
