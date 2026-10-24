import type { Plugin, UserConfig } from 'vite-plus';
import { defaultClientConditions, defaultServerConditions } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

/** Custom export condition every published package maps to its `src/` entry. */
export const SOURCE_CONDITION = '@contour-ui/source';

/**
 * Resolve `@contour-ui/*` workspace packages to their TypeScript sources (HMR,
 * no prior build) by prepending the source condition in every environment.
 * Only for workspace consumers (apps, Storybook, tests); published consumers
 * never see the condition.
 */
export function contourSource(): Plugin {
  return {
    name: 'contour-ui:source-condition',
    enforce: 'pre',
    configEnvironment(_name, config) {
      const defaults =
        config.consumer === 'server' ? defaultServerConditions : defaultClientConditions;
      const current = config.resolve?.conditions ?? defaults;
      if (current.includes(SOURCE_CONDITION)) {
        return undefined;
      }
      return { resolve: { conditions: [SOURCE_CONDITION, ...current] } };
    },
  };
}

type PackConfig = NonNullable<UserConfig['pack']>;

export interface LibraryPackOptions {
  /**
   * tsdown entries, e.g. `{ index: 'src/index.ts', styles: 'src/styles.css' }`. A CSS entry is
   * bundled into `dist/<name>.css`: Lightning CSS inlines its `@import`s (`layer()` included).
   */
  readonly entry: Record<string, string>;
  /** CSS entry points copied verbatim to `dist/` (kept unbundled so `@import`s stay external). */
  readonly css?: readonly string[];
}

/** Shared `vp pack` settings for every published package: ESM-only, d.ts, publint + attw. */
export function libraryPack({ entry, css = [] }: LibraryPackOptions): PackConfig {
  return {
    entry,
    format: 'esm',
    platform: 'neutral',
    dts: true,
    sourcemap: true,
    // One stylesheet per CSS entry instead of a single merged `style.css`; the empty JS
    // chunk of a CSS-only entry is dropped.
    css: { splitting: true },
    copy: css.map((from) => ({ from, to: 'dist' })),
    publint: { level: 'suggestion' },
    // CSS entry points have no types by design; attw only checks the JS entries.
    attw: { profile: 'esm-only', level: 'error', excludeEntrypoints: [/\.css$/u] },
  };
}

/** Vitest browser mode on headless Chromium via Playwright (real pointer events). */
export function chromium(): NonNullable<NonNullable<UserConfig['test']>['browser']> {
  return {
    enabled: true,
    provider: playwright(),
    headless: true,
    instances: [{ browser: 'chromium' }],
  };
}
