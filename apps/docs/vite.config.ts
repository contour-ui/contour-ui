import { contourSource } from '@contour-ui/vite-config';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [
    contourSource(),
    fumadocsMdx(),
    // Tailwind's own Lightning CSS pass warns on fumadocs-ui's `::highlight()`
    // rules; Vite's CSS minifier still minifies the output.
    tailwindcss({ optimize: false }),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  // Fixed port next to the playground (5173), so both can run at once.
  server: { port: 5174 },
});
