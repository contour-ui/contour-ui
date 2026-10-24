import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Shared `.storybook/main.ts` settings for every package Storybook: React + Vite,
 * co-located stories/MDX under `src/`, docs + a11y + Vitest (stories as tests).
 */
export function storybookConfig(overrides: Partial<StorybookConfig> = {}): StorybookConfig {
  return {
    framework: '@storybook/react-vite',
    stories: ['../src/**/*.@(mdx|stories.tsx)'],
    addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
    core: { disableTelemetry: true },
    viteFinal: (config) => ({
      ...config,
      // The Storybook runtime (docs renderer, axe) ships large chunks by design.
      build: { ...config.build, chunkSizeWarningLimit: 2048 },
    }),
    ...overrides,
  };
}
