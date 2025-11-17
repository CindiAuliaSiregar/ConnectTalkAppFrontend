import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills' // <-- Impor ini

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Ini akan memastikan simple-peer mendapatkan semua yang dia butuhkan
      global: true,
      process: true,
      buffer: true,
    }),
  ],
  resolve: {
    alias: {
      // Pastikan process mengarah ke polyfill
      process: 'process/browser',
      stream: 'stream-browserify',
      zlib: 'browserify-zlib',
      util: 'util',
    },
  },
})