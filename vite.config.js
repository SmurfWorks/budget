import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: 'index.html',
        // A short page that explains the app, with a link into it.
        welcome: 'welcome/index.html',
      },
    },
  },
  test: {
    environment: 'node',
  },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Budget Helper',
        short_name: 'Budget Helper',
        description: 'Recurring bills and income, turned into a budget you can spend from, with reminders the day before a bill goes out.',
        // Left out on purpose: Chrome on Android paints an installed app's navigation bar with the manifest colour,
        // which has no dark variant. The theme-color meta tags in index.html still colour the status bar.
        // The plugin fills in its own default unless this is explicitly undefined.
        theme_color: undefined,
        background_color: '#efe8dc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        lang: 'en',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,ico}'],
        navigateFallback: 'index.html',
        // Shows reminders from the push server, and opens the app when one is tapped.
        importScripts: ['notification-click.js'],
      },
    }),
  ],
})
