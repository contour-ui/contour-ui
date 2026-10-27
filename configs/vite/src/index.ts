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
  /**
   * Emit one file per source module, mirroring `src/`, instead of bundles. Module-level directives
   * such as `'use client'` then stay with their modules: rolldown keeps a directive only on an
   * entry module or with preserved modules (https://rolldown.rs/in-depth/directives), so a bundle
   * loses them, and React Server Components treat the whole package as server code. Its
   * `MODULE_LEVEL_DIRECTIVE` warnings are false alarms in this mode and stay off. CSS entries are
   * bundled as before.
   *
   * @defaultValue false
   */
  readonly unbundle?: boolean;
}

/** Shared `vp pack` settings for every published package: ESM-only, d.ts, publint + attw. */
export function libraryPack({ entry, css = [], unbundle = false }: LibraryPackOptions): PackConfig {
  return {
    entry,
    ...(unbundle ? { unbundle: true, checks: { moduleLevelDirective: false } } : {}),
    format: 'esm',
    platform: 'neutral',
    dts: true,
    sourcemap: true,
    // One stylesheet per CSS entry instead of a single merged `style.css`; the empty JS
    // chunk of a CSS-only entry is dropped.
    css: { splitting: true },
    copy: css.map((from) => ({ from, to: 'dist' })),
    // Nothing from node_modules goes into dist: dependencies and peers stay imports, and a type
    // used in a public signature must come from a declared dependency or peer. Without this, a
    // devDependency such as @types/mdx would be copied into dist under its path in node_modules.
    deps: { onlyBundle: [] },
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
