import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '爱你老己 | TCM Health',
        short_name: '爱你老己',
        description: '温暖治愈的中医健康助手，关注当下，爱自己。',
        theme_color: '#FEF9E7',
        background_color: '#FEF9E7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'https://lucide.dev/icons/heart-handshake.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f91d.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f91d.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 3000,
    host: true
  }
});