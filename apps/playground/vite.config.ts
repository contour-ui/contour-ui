import { contourSource } from '@contour-ui/vite-config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [contourSource(), react()],
  server: { port: 5173 },
});
