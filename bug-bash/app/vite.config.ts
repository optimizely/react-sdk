import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@optimizely/optimizely-sdk'],
  },
  define: {
    'process.env': process.env
  }
})
