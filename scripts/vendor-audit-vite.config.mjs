import react from '../frontend/node_modules/@vitejs/plugin-react/dist/index.js'

// Keep audit tests independent of unrelated SPA routes and their large dependency
// graph; Vite can reuse this dedicated prebundle across npm test invocations.
export default {
  plugins: [react()],
  optimizeDeps: { entries: ['tests/vendor-audit.html'] },
  cacheDir: 'node_modules/.vite-vendor-audit-tests',
}
