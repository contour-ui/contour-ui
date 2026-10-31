import type { Plugin, TestProjectInlineConfiguration, UserConfig } from 'vite-plus';
import type { TsdownPluginOption } from 'vite-plus/pack';
import { defaultClientConditions, defaultServerConditions } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

/** Custom export condition every published package maps to its `src/` entry. */
export const SOURCE_CONDITION = '@contour-ui/source';

/**
 * Resolve `@contour-ui/*` workspace packages to their TypeScript sources (HMR,
 * no prior build) by prepending the source condition in every environment.
 * Only for workspace consumers (apps, tests); published consumers
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
   * Left out when a plugin adds the entries (the tokens' `designTokens`).
   */
  readonly entry?: Record<string, string>;
  /** CSS entry points copied verbatim to `dist/` (kept unbundled so `@import`s stay external). */
  readonly css?: readonly string[];
  /** Other files copied verbatim to `dist/`, such as JSON data exported as is. */
  readonly copy?: readonly string[];
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
  /**
   * Imports that are no npm packages yet stay imports, such as the `soundor:*` modules a Soundor
   * runtime provides: without this, the bundler warns that it cannot find them.
   */
  readonly external?: readonly RegExp[];
  /**
   * tsdown or Rolldown plugins, such as `designTokens` of `@contour-ui/tokens-compiler`. A list:
   * Vite+ appends a declarations plugin to `pack.plugins` and keeps only what was an array.
   */
  readonly plugins?: readonly TsdownPluginOption[];
}

/** Shared `vp pack` settings for every published package: ESM-only, d.ts, publint + attw. */
export function libraryPack({
  entry,
  css = [],
  copy = [],
  unbundle = false,
  external = [],
  plugins = [],
}: LibraryPackOptions): PackConfig {
  return {
    ...(entry === undefined ? {} : { entry }),
    ...(plugins.length > 0 ? { plugins: [...plugins] } : {}),
    ...(unbundle ? { unbundle: true, checks: { moduleLevelDirective: false } } : {}),
    format: 'esm',
    platform: 'neutral',
    dts: true,
    sourcemap: true,
    // One stylesheet per CSS entry instead of a single merged `style.css`; the empty JS
    // chunk of a CSS-only entry is dropped.
    css: { splitting: true },
    copy: [...css, ...copy].map((from) => ({ from, to: 'dist' })),
    // Nothing from node_modules goes into dist: dependencies and peers stay imports, and a type
    // used in a public signature must come from a declared dependency or peer. Without this, a
    // devDependency such as @types/mdx would be copied into dist under its path in node_modules.
    deps: { onlyBundle: [], ...(external.length > 0 ? { neverBundle: [...external] } : {}) },
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

/** The screenshot tests of a package (`vp run visual`): exclude them from its other projects. */
export const VISUAL_TESTS = ['src/**/*.visual.test.tsx'];

/**
 * Chromium of the screenshot tests. `vp run visual` starts `playwright run-server` from the
 * pinned Playwright Linux image in Docker and passes its address as `CONTOUR_VISUAL_SERVER`, so
 * screenshots compare pixel for pixel on any machine. Inside that image (CI) the image's own
 * Chromium launches. Anywhere else the local Chromium launches, only to try tests out: its
 * screenshots are not comparable with the committed ones.
 */
function visualChromium(): NonNullable<NonNullable<UserConfig['test']>['browser']> {
  const server = process.env['CONTOUR_VISUAL_SERVER'];
  return {
    enabled: true,
    provider:
      server === undefined
        ? playwright()
        : playwright({
            connectOptions: {
              wsEndpoint: server,
              // The browser in the container reaches the Vitest server on this machine's loopback.
              exposeNetwork: '<loopback>',
            },
          }),
    headless: true,
    instances: [{ browser: 'chromium', viewport: { width: 1280, height: 720 } }],
    expect: {
      toMatchScreenshot: {
        // `__visual__/<test file>/<state>-<theme>.png`, committed (git ignores `__screenshots__`).
        // One browser on one platform, so the name carries neither.
        resolveScreenshotPath: ({ arg, ext, root, testFileDirectory, testFileName }) =>
          `${root}/${testFileDirectory}/__visual__/${testFileName}/${arg}${ext}`,
      },
    },
  };
}

/**
 * The project of a package's screenshot tests, `<name>:visual`, only while `CONTOUR_VISUAL` is set
 * (`vp run visual`), so that plain `vp test` needs no Docker.
 */
export function visualProjects(name: string): TestProjectInlineConfiguration[] {
  return process.env['CONTOUR_VISUAL'] === undefined
    ? []
    : [
        {
          extends: true,
          test: { name: `${name}:visual`, include: VISUAL_TESTS, browser: visualChromium() },
        },
      ];
}
