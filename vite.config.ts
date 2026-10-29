import { defineConfig } from 'vite-plus';

import { boundaryLintOverrides } from './scripts/layers.ts';

/** Globals core must not touch: Hermes (Soundor) does not provide them. */
const HERMES_MISSING_GLOBALS = ['Intl', 'SharedArrayBuffer', 'Atomics', 'Float16Array'];

/** Locale-dependent methods: their results depend on Intl, which Hermes lacks. */
const LOCALE_METHODS = [
  'toLocaleString',
  'toLocaleDateString',
  'toLocaleTimeString',
  'toLocaleUpperCase',
  'toLocaleLowerCase',
  'localeCompare',
];

/**
 * Root Vite+ config: the only place for `lint`, `fmt`, `staged` and
 * workspace-level tasks. Package-level `vite.config.ts` files hold Vite, Vitest
 * and pack settings only; per-package lint rules go through `lint.overrides`.
 */
export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },

  fmt: {
    singleQuote: true,
    printWidth: 100,
    ignorePatterns: [
      '**/CHANGELOG.md',
      '.changeset/*.md',
      'pnpm-lock.yaml',
      // Token data keeps its authored (and generator-written) layout.
      'packages/tokens/contour.resolver.json',
      'packages/tokens/src/**/*.tokens.json',
      // Style Dictionary output, compared byte-for-byte by src/generated.test.ts.
      'packages/tokens/src/generated/**',
      // Icon data written by scripts/build-icons.ts, compared byte-for-byte by a freshness test.
      'packages/icons/src/generated/**',
    ],
  },

  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: [
      '**/dist/**',
      '**/build/**',
      '**/storybook-static/**',
      '**/playwright-report/**',
      '**/coverage/**',
      '**/.react-router/**',
      '**/.source/**',
    ],
    plugins: ['typescript', 'unicorn', 'import', 'oxc', 'promise'],
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'error',
      pedantic: 'error',
    },
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',

      // --- Pedantic rules that are pure noise for this codebase -----------------
      // Size limits are a review concern; arbitrary numbers only cause churn.
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      // TODO/FIXME comments are a deliberate, tracked part of the scaffold.
      'no-warning-comments': 'off',
      // Short trailing comments explaining a config value read better inline.
      'no-inline-comments': 'off',
      // Readonly-deep parameter types are impractical with React props and DOM types.
      'typescript/prefer-readonly-parameter-types': 'off',
      // Conflicts with `exactOptionalPropertyTypes`, which needs explicit `undefined`.
      'unicorn/no-useless-undefined': 'off',

      // --- Hard rules -----------------------------------------------------------
      'typescript/no-explicit-any': 'error',
      'typescript/no-non-null-assertion': 'error',
      'typescript/no-floating-promises': 'error',
      'typescript/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      'typescript/consistent-type-exports': 'error',
      'typescript/no-import-type-side-effects': 'error',
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import/no-default-export': 'error',
      'import/no-cycle': 'error',
      // Stylesheets are imported for their side effects.
      'import/no-unassigned-import': ['error', { allow: ['**/*.css'] }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-var': 'error',

      // --- Style, selectively ---------------------------------------------------
      'prefer-const': 'error',
      'object-shorthand': 'error',
      curly: 'error',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/no-mutable-exports': 'error',
      'typescript/array-type': ['error', { default: 'array-simple' }],
      'typescript/consistent-type-definitions': ['error', 'interface'],
      'typescript/no-inferrable-types': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/throw-new-error': 'error',
    },
    overrides: [
      // Layer boundaries, generated from scripts/layers.ts (shared with check-boundaries).
      ...boundaryLintOverrides(),
      {
        // core also runs on Hermes (the Soundor plugin UI runtime), built without Intl.
        files: ['packages/core/src/**'],
        rules: {
          'no-restricted-globals': [
            'error',
            ...HERMES_MISSING_GLOBALS.map((name) => ({
              name,
              message: `${name} is not available on Hermes (Soundor), where core also runs.`,
            })),
          ],
          'no-restricted-properties': [
            'error',
            ...LOCALE_METHODS.map((property) => ({
              property,
              message:
                'Locale-dependent and missing on Hermes without Intl: format in core/format.',
            })),
          ],
          'no-eval': 'error',
          'no-new-func': 'error',
        },
      },
      {
        files: [
          'packages/core/src/react/**',
          'packages/headless-react/**',
          'packages/kit/**',
          'packages/audio/**',
          'apps/**',
          '**/*.tsx',
          '**/.storybook/**',
        ],
        plugins: ['react', 'jsx-a11y'],
        rules: {
          // React 17+ automatic JSX runtime.
          'react/react-in-jsx-scope': 'off',
        },
      },
      {
        files: ['**/*.test.ts', '**/*.test.tsx'],
        plugins: ['vitest'],
      },
      {
        // Tools discover these modules through their default export.
        files: [
          '**/vite.config.ts',
          '**/*.stories.tsx',
          '**/.storybook/main.ts',
          '**/.storybook/preview.ts',
          '**/.storybook/preview.tsx',
          '**/playwright.config.ts',
          'apps/storybook/visual/global-setup.ts',
          'apps/docs/e2e/global-setup.ts',
          'apps/docs/react-router.config.ts',
          'apps/docs/app/root.tsx',
          'apps/docs/app/routes.ts',
          'apps/docs/app/routes/**',
        ],
        rules: {
          'import/no-default-export': 'off',
        },
      },
      {
        // Repo scripts are CLIs: printing is their output.
        files: ['scripts/**', 'apps/*/scripts/**', 'packages/*/scripts/**'],
        rules: {
          'no-console': 'off',
        },
      },
    ],
  },

  test: {
    // Each package owns its Vitest setup (node for core/tokens/icons, Chromium
    // browser mode + Storybook stories for UI packages).
    projects: ['packages/*/vite.config.ts'],
  },

  run: {
    cache: { tasks: true, scripts: false },
    tasks: {
      boundaries: {
        command: 'node scripts/check-boundaries.ts',
      },
    },
  },
});
