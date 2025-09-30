import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Ensure esbuild/Babel handle JSX automatically
  esbuild: {
    jsx: 'automatic',
  },
  // During dependency scan, treat .js as JSX (your codebase has JSX in .js)
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})