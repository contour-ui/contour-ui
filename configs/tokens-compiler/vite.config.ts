import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    name: 'tokens-compiler',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
