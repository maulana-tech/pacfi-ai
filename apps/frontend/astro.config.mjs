import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  vite: {
    ssr: {
      external: ['react', 'react-dom'],
    },
  },
  server: {
    port: 3000,
  },
});
