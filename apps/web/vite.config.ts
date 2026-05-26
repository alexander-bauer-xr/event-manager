import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/events',
  plugins: [react()],
  server: {
    port: 3000,
  },
});
