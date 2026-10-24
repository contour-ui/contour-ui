import type { StorybookConfig } from '@storybook/react-vite';

import { PACKAGE_STORYBOOKS } from '../refs.ts';

/**
 * Composition host: no components of its own, only refs.
 * - dev: refs point at the package dev servers on fixed ports (`vp run storybook` at the root);
 * - production: refs point at the static builds copied under `./<name>/` by `scripts/compose.ts`.
 */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    // The Storybook runtime ships large chunks by design.
    build: { ...viteConfig.build, chunkSizeWarningLimit: 2048 },
  }),
  refs: (_config, { configType }) =>
    Object.fromEntries(
      PACKAGE_STORYBOOKS.map(({ name, title, port }) => [
        name,
        {
          title,
          url: configType === 'DEVELOPMENT' ? `http://localhost:${port}` : `./${name}`,
        },
      ]),
    ),
};

export default config;
