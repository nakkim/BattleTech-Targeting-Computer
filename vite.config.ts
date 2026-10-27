/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the app from the repository's subpath.
  base: '/BattleTech-Targeting-Computer/',
  test: {
    // The cached catalog module would miss 'Mech files added to src/mechs/ since the last run.
    fsModuleCache: false,
  },
})
