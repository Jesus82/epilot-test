import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['test/unit/**/*.{test,spec}.ts', 'app/**/__tests__/**/*.{test,spec}.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
      '@': resolve(__dirname, './app'),
    },
  },
})
