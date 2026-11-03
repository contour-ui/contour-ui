/**
 * Single source of truth for the contour-ui layer architecture.
 *
 * Consumed by:
 * - `vite.config.ts` (root): generates the oxlint `no-restricted-imports` overrides;
 * - `scripts/check-boundaries.ts`: validates declared dependencies and CSS `@import`s.
 *
 * Keep this file dependency-free and erasable-syntax-only: it runs under plain
 * `node` (type stripping) as well as inside the Vite+ config loader.
 */

import type { OxlintOverride } from 'vite-plus/lint';

export const SCOPE = '@contour-ui';

/** Custom export condition that resolves workspace packages to their sources. */
export const SOURCE_CONDITION = '@contour-ui/source';

/** How a package may declare `react` / `react-dom`. */
export type ReactPolicy =
  /** Not in `dependencies` or `peerDependencies` (dev-only use, e.g. tests, is fine). */
  | 'none'
  /** `react` only as an optional peer; `react-dom` not at all. */
  | 'optional-peer'
  /** Both `react` and `react-dom` as required peers. */
  | 'peer'
  /**
   * The element layer: `react` as a required peer, every renderer (`react-dom`, `@soundor/react`)
   * as an optional one, since an app brings the renderer of its platform.
   */
  | 'renderers'
  /**
   * React on any renderer: `react` as a required peer, `react-dom` at most as an optional one (for
   * the modules that run on the web only), no other renderer: those reach the package through
   * `@contour-ui/primitive`.
   */
  | 'cross-platform';

export interface LayerPackage {
  /** Directory under `packages/` and the unscoped npm name. */
  readonly name: string;
  readonly layer: 0 | 1 | 2 | 3 | 4 | 5;
  readonly purpose: string;
  /** Internal packages (unscoped names) this package may depend on. */
  readonly allowed: readonly string[];
  readonly react: ReactPolicy;
  /**
   * Where the workspace reads the package from: its sources under the `@contour-ui/source`
   * condition (the default), or `dist`, for a package whose files a compiler writes at build time.
   */
  readonly source?: 'src' | 'dist';
}

export const LAYERS: readonly LayerPackage[] = [
  {
    name: 'tokens',
    layer: 0,
    purpose: 'DTCG design tokens -> CSS variables / TS',
    allowed: [],
    react: 'none',
    // Built by @contour-ui/tokens-compiler: its outputs exist only in dist.
    source: 'dist',
  },
  {
    name: 'icons',
    layer: 0,
    purpose: 'SVG icons -> path data + canvas drawing',
    allowed: [],
    react: 'none',
  },
  {
    name: 'fonts',
    layer: 0,
    purpose: 'font files: WOFF2 faces for the web, static TTF for Soundor',
    allowed: [],
    react: 'none',
  },
  {
    name: 'core',
    layer: 1,
    purpose: 'framework- and renderer-agnostic logic',
    allowed: [],
    react: 'optional-peer',
  },
  {
    name: 'primitive',
    layer: 2,
    purpose: 'the element layer: elements in web words and platform services, a build per platform',
    allowed: ['core'],
    react: 'renderers',
  },
  {
    name: 'headless-react',
    layer: 3,
    purpose: 'unstyled React components + hooks, on @contour-ui/primitive',
    allowed: ['core', 'primitive'],
    react: 'cross-platform',
  },
  {
    name: 'react',
    layer: 4,
    purpose: 'styled React components: Essentials and Audio',
    allowed: ['headless-react', 'primitive', 'tokens', 'icons', 'fonts'],
    react: 'cross-platform',
  },
  {
    name: 'fumadocs',
    layer: 5,
    purpose: 'documentation layout for fumadocs-core sites, built from @contour-ui/react',
    allowed: ['react', 'headless-react', 'primitive', 'tokens', 'icons', 'fonts'],
    react: 'peer',
  },
];

/**
 * Private workspace tooling (under `tooling/`). Any package may list these in
 * `devDependencies`, never in `dependencies` or `peerDependencies`.
 */
export const TOOLING_PACKAGES: readonly string[] = [
  'typescript-config',
  'vite-config',
  'tokens-compiler',
  'test-harness',
];

/**
 * The modules of each renderer. Only the platform folders of `primitive` import them: a module of
 * one renderer reachable from a package that is built once breaks the builds of the other
 * platforms, even unused.
 */
export const RENDERER_MODULES = {
  web: ['react-dom', 'react-dom/*'],
  soundor: ['@soundor/*', 'soundor:*'],
  'react-native': ['react-native', 'react-native/*', 'react-native-svg'],
} as const;

export type Renderer = keyof typeof RENDERER_MODULES;

/** Files that may import the modules of some renderers. */
export interface RendererImports {
  /** Globs from the repository root. */
  readonly files: readonly string[];
  readonly renderers: readonly Renderer[];
}

/**
 * Where renderer modules may be imported. Later entries win where globs overlap: a Soundor test
 * of a cross-platform package drives Soundor, its other tests the web.
 */
export const RENDERER_IMPORTS: readonly RendererImports[] = [
  // Tests drive the renderer of their platform: the web, unless their name says Soundor.
  { files: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx'], renderers: ['web'] },
  {
    files: ['packages/*/src/**/*.soundor.test.ts', 'packages/*/src/**/*.soundor.test.tsx'],
    renderers: ['soundor'],
  },
  // The backends of the element layer.
  { files: ['packages/primitive/src/web/**'], renderers: ['web'] },
  { files: ['packages/primitive/src/soundor/**'], renderers: ['soundor'] },
  // Modules of headless-react that run on the web only and still use React DOM themselves,
  // until their platform code moves into the element layer.
  {
    files: [
      'packages/headless-react/src/portal/portal.tsx',
      'packages/headless-react/src/presence/use-presence.ts',
    ],
    renderers: ['web'],
  },
];

/**
 * The renderers a package may import anywhere, by its React policy: the docs layout runs on the
 * web only; every other package imports none.
 */
const PACKAGE_RENDERERS: Readonly<Record<ReactPolicy, readonly Renderer[]>> = {
  none: [],
  'optional-peer': [],
  peer: ['web'],
  renderers: [],
  'cross-platform': [],
};

/**
 * The folders of code written once for every platform, above the element layer: the components
 * that run on Soundor too. Their files (other than `*.web.*` and `*.soundor.*`) may write only the
 * roles and ARIA attributes of the compatibility table of `primitive`
 * (`packages/primitive/src/shared/compat.ts`): TypeScript checks no attribute with a dash in JSX,
 * so `vp run boundaries` does.
 */
export const CROSS_PLATFORM_SOURCES: readonly string[] = [
  'packages/primitive/src/shared',
  'packages/headless-react/src/knob',
  'packages/react/src/button',
  'packages/react/src/knob',
];

/** External packages no published package may depend on or import. */
export const FORBIDDEN_EXTERNALS: readonly string[] = ['tailwindcss', '@tailwindcss/*'];

/**
 * Directory-level rules inside a single package. Files under `dir` must not
 * import (relatively) from any directory in `forbid`.
 */
export interface InternalRule {
  readonly pkg: string;
  /** The package directory: `packages/<pkg>` when left out. */
  readonly root?: string;
  readonly dir: string;
  readonly forbid: readonly string[];
  readonly message: string;
}

/**
 * The layers of the tokens compiler (`tooling/tokens-compiler`): the model is the
 * contract; only `resolve/` reads the sources, checks read the model alone, outputs write it
 * through a platform.
 */
const tokensCompilerRule = (
  dir: string,
  forbid: readonly string[],
  message: string,
): InternalRule => ({
  pkg: 'tokens-compiler',
  root: 'tooling/tokens-compiler',
  dir: `src/${dir}`,
  forbid,
  message: `tokens-compiler: ${message}`,
});

export const INTERNAL_RULES: readonly InternalRule[] = [
  {
    pkg: 'core',
    dir: 'src/states',
    forbid: ['interactions', 'react'],
    message: 'core: states/ must not import interactions/ (both may import machine/).',
  },
  {
    pkg: 'core',
    dir: 'src/interactions',
    forbid: ['states', 'react'],
    message: 'core: interactions/ must not import states/ (both may import machine/).',
  },
  tokensCompilerRule(
    'model',
    ['resolve', 'platforms', 'outputs', 'checks'],
    'model/ is the contract and imports no other layer.',
  ),
  tokensCompilerRule(
    'resolve',
    ['platforms', 'outputs', 'checks'],
    'resolve/ turns the sources into the model and knows nothing above it.',
  ),
  tokensCompilerRule(
    'platforms',
    ['resolve', 'outputs', 'checks'],
    'platforms/ read the model, never the sources, the outputs or the checks.',
  ),
  tokensCompilerRule(
    'outputs',
    ['resolve', 'checks'],
    'outputs/ read the model through a platform, never the sources or the checks.',
  ),
  tokensCompilerRule(
    'checks',
    ['resolve', 'platforms', 'outputs'],
    'checks/ read the model alone.',
  ),
];

/** The only place in `core` allowed to import React. */
export const CORE_REACT_DIR = 'src/react';

export const scoped = (name: string): string => `${SCOPE}/${name}`;

export function getLayer(name: string): LayerPackage | undefined {
  return LAYERS.find((pkg) => pkg.name === name);
}

/** Internal packages that `name` must not depend on or import. */
export function forbiddenInternals(name: string): string[] {
  const pkg = getLayer(name);
  if (pkg === undefined) {
    return [];
  }
  return LAYERS.map((other) => other.name).filter(
    (other) => other !== name && !pkg.allowed.includes(other),
  );
}

// ---------------------------------------------------------------------------
// oxlint `no-restricted-imports` overrides generated from the table above.
// ---------------------------------------------------------------------------

interface RestrictedPattern {
  group?: string[];
  regex?: string;
  message: string;
}

const escapeRegex = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

function internalPatterns(name: string): RestrictedPattern[] {
  const forbidden = forbiddenInternals(name);
  if (forbidden.length === 0) {
    return [];
  }
  const allowed = getLayer(name)?.allowed ?? [];
  const allowedText =
    allowed.length > 0 ? allowed.map((other) => scoped(other)).join(', ') : 'no internal packages';
  return [
    {
      group: forbidden.flatMap((other) => [scoped(other), `${scoped(other)}/*`]),
      message: `Layer violation: ${scoped(name)} may only depend on ${allowedText}. See AGENTS.md.`,
    },
    {
      // Relative imports reaching into a sibling package bypass the scoped-name check.
      regex: String.raw`^(\.\./)+(packages/)?(${forbidden.map((other) => escapeRegex(other)).join('|')})/`,
      message: `Layer violation: do not import another package through a relative path.`,
    },
  ];
}

const tailwindPattern: RestrictedPattern = {
  group: FORBIDDEN_EXTERNALS.flatMap((name) =>
    name.endsWith('/*') ? [name] : [name, `${name}/*`],
  ),
  message: 'No Tailwind in packages: style components with CSS and token CSS variables.',
};

const reactPattern: RestrictedPattern = {
  group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
  message: `core is React-free; React code belongs in ${scoped('core')}/react (${CORE_REACT_DIR}/).`,
};

const relativeDirPattern = (dirs: readonly string[], message: string): RestrictedPattern => ({
  regex: String.raw`^\.{1,2}/(.*/)?(${dirs.map((dir) => escapeRegex(dir)).join('|')})(/|$)`,
  message,
});

const restrict = (files: string[], patterns: RestrictedPattern[]): OxlintOverride => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns }] },
});

/**
 * Overrides are order-sensitive: a later matching override replaces the rule
 * options of an earlier one, so directory-level entries repeat the package-level
 * patterns and come after them.
 */
const RENDERERS: readonly Renderer[] = ['web', 'soundor', 'react-native'];

function rendererPattern(forbidden: readonly Renderer[]): RestrictedPattern[] {
  if (forbidden.length === 0) {
    return [];
  }
  return [
    {
      group: forbidden.flatMap((renderer) => [...RENDERER_MODULES[renderer]]),
      message: `Renderer modules belong in the platform folders of ${scoped('primitive')} (src/web, src/soundor): code above it is built once for every platform. See AGENTS.md.`,
    },
  ];
}

/** The renderers a package forbids, given the ones its files may also import. */
function forbiddenRenderers(pkg: LayerPackage, allowed: readonly Renderer[] = []): Renderer[] {
  const own = PACKAGE_RENDERERS[pkg.react];
  return RENDERERS.filter((renderer) => !own.includes(renderer) && !allowed.includes(renderer));
}

/** Every pattern a package's files obey, with the renderers some of them may import. */
function packagePatterns(
  pkg: LayerPackage,
  renderers: readonly Renderer[] = [],
): RestrictedPattern[] {
  const forbidden = forbiddenRenderers(pkg, renderers);
  const patterns = [...internalPatterns(pkg.name), tailwindPattern];
  if (pkg.name === 'core') {
    // core forbids React DOM with React itself; the other renderers as everyone does.
    return [...patterns, reactPattern, ...rendererPattern(forbidden.filter((r) => r !== 'web'))];
  }
  return [...patterns, ...rendererPattern(forbidden)];
}

/** The globs of `entry` that apply to the files of `pkg`, rooted in its directory. */
function globsIn(pkg: LayerPackage, entry: RendererImports): string[] {
  const root = `packages/${pkg.name}/`;
  return entry.files.flatMap((glob) => {
    if (glob.startsWith('packages/*/')) {
      return [root + glob.slice('packages/*/'.length)];
    }
    return glob.startsWith(root) ? [glob] : [];
  });
}

export function boundaryLintOverrides(): OxlintOverride[] {
  const overrides: OxlintOverride[] = [];

  for (const pkg of LAYERS) {
    const root = `packages/${pkg.name}`;

    if (pkg.name === 'core') {
      const reactSubpath = relativeDirPattern(
        ['react'],
        `core: only ${scoped('core')}/react may use React; do not import ${CORE_REACT_DIR}/ from React-free code.`,
      );
      const base = [...internalPatterns(pkg.name), tailwindPattern];
      overrides.push(
        restrict([`${root}/**`], [...packagePatterns(pkg), reactSubpath]),
        restrict(
          [`${root}/${CORE_REACT_DIR}/**`],
          [...base, ...rendererPattern(forbiddenRenderers(pkg, ['web']))],
        ),
      );
    } else {
      overrides.push(restrict([`${root}/**`], packagePatterns(pkg)));
    }

    // Where some files of a package above the renderers may import one (in order: a later entry
    // wins where they overlap).
    if (pkg.react === 'renderers' || pkg.react === 'cross-platform') {
      for (const entry of RENDERER_IMPORTS) {
        const files = globsIn(pkg, entry);
        if (files.length > 0) {
          overrides.push(restrict(files, packagePatterns(pkg, entry.renderers)));
        }
      }
    }
  }

  for (const rule of INTERNAL_RULES) {
    // Tooling has no layer: its directory rules stand alone.
    const pkg = getLayer(rule.pkg);
    const base = pkg === undefined ? [] : packagePatterns(pkg);
    overrides.push(
      restrict(
        [`${rule.root ?? `packages/${rule.pkg}`}/${rule.dir}/**`],
        [...base, relativeDirPattern(rule.forbid, rule.message)],
      ),
    );
  }

  return overrides;
}
