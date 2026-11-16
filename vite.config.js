import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works from a GitHub Pages project subpath.
  base: './',
  build: {
    // The editor chunk is lazy loaded and cached on its own.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'editor', test: /node_modules[\\/](@codemirror|@lezer|crelt|style-mod|w3c-keyname|@marijn)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
