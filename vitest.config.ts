import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    include: [
      'app/**/__tests__/**/*.{test,spec}.ts',
      'server/**/__tests__/**/*.{test,spec}.ts',
    ],
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
      '@': resolve(__dirname, './app'),
      '~~': resolve(__dirname, './'),
      '~shared': resolve(__dirname, './shared'),
    },
  },
})
