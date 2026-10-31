import { contourSource, libraryPack } from '@contour-ui/vite-config';
import { soundor } from '@soundor/vitest';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  // `config: false`: a library has no soundor.config.ts, so its tests run in an empty plugin.
  plugins: [contourSource(), soundor({ config: false })],
  pack: libraryPack({
    entry: { index: 'src/index.ts' },
    // One file per module, as in the other UI packages.
    unbundle: true,
    // The runtime's own modules: every Soundor runtime provides them to the plugin.
    external: [/^soundor:/u],
  }),
  // In Node, on Soundor's simulated runtime: the node tree, input, focus and accessibility, but
  // no layout or pixels. The plugin reads the environment here, not inside `projects`.
  test: {
    name: 'soundor',
    environment: 'soundor',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
