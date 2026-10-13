import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // echarts（约 300KB）单独成块：首屏主包更小，且多次访问命中同一份缓存
        advancedChunks: {
          groups: [
            { name: 'echarts', test: /[\\/]node_modules[\\/](echarts|zrender)[\\/]/ },
          ],
        },
      },
    },
  },
})
