import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: '車務管理與加班系統',
        short_name: '車務系統',
        description: '自動生成車輛紀錄表與加班清冊',
        theme_color: '#059669',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,xlsx,png,ico}'],
        // 增加緩存大小限制以應對較大的 Excel 模板
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
})
