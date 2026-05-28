import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    typecheck: {
      tsconfig: './tsconfig.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
