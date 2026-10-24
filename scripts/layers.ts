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
  /** Not in `dependencies` or `peerDependencies` (dev-only use, e.g. stories, is fine). */
  | 'none'
  /** `react` only as an optional peer; `react-dom` not at all. */
  | 'optional-peer'
  /** Both `react` and `react-dom` as required peers. */
  | 'peer';

export interface LayerPackage {
  /** Directory under `packages/` and the unscoped npm name. */
  readonly name: string;
  readonly layer: 0 | 1 | 2 | 3;
  readonly purpose: string;
  /** Internal packages (unscoped names) this package may depend on. */
  readonly allowed: readonly string[];
  readonly react: ReactPolicy;
}

export const LAYERS: readonly LayerPackage[] = [
  {
    name: 'tokens',
    layer: 0,
    purpose: 'DTCG design tokens -> CSS variables / TS',
    allowed: [],
    react: 'none',
  },
  {
    name: 'icons',
    layer: 0,
    purpose: 'SVG icons -> React components / canvas commands',
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
    name: 'headless',
    layer: 2,
    purpose: 'unstyled React DOM components + hooks',
    allowed: ['core'],
    react: 'peer',
  },
  {
    name: 'kit',
    layer: 3,
    purpose: 'styled general-purpose components',
    allowed: ['headless', 'tokens', 'icons'],
    react: 'peer',
  },
  {
    name: 'audio',
    layer: 3,
    purpose: 'styled audio components',
    allowed: ['headless', 'tokens', 'icons', 'kit'],
    react: 'peer',
  },
];

/**
 * Private workspace tooling (under `configs/`). Any package may list these in
 * `devDependencies`, never in `dependencies` or `peerDependencies`.
 */
export const TOOLING_PACKAGES: readonly string[] = ['typescript-config', 'vite-config'];

/** External packages no published package may depend on or import. */
export const FORBIDDEN_EXTERNALS: readonly string[] = ['tailwindcss', '@tailwindcss/*'];

/**
 * Directory-level rules inside a single package. Files under `dir` must not
 * import (relatively) from any directory in `forbid`.
 */
export interface InternalRule {
  readonly pkg: string;
  readonly dir: string;
  readonly forbid: readonly string[];
  readonly message: string;
}

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
  message: 'No Tailwind in packages: style kits with CSS and token CSS variables.',
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
export function boundaryLintOverrides(): OxlintOverride[] {
  const overrides: OxlintOverride[] = [];

  for (const pkg of LAYERS) {
    const base = [...internalPatterns(pkg.name), tailwindPattern];
    const root = `packages/${pkg.name}`;

    if (pkg.name !== 'core') {
      overrides.push(restrict([`${root}/**`], base));
      continue;
    }

    const reactSubpath = relativeDirPattern(
      ['react'],
      `core: only ${scoped('core')}/react may use React; do not import ${CORE_REACT_DIR}/ from React-free code.`,
    );
    overrides.push(
      restrict([`${root}/**`], [...base, reactPattern, reactSubpath]),
      restrict([`${root}/${CORE_REACT_DIR}/**`], base),
    );
  }

  for (const rule of INTERNAL_RULES) {
    const base = [...internalPatterns(rule.pkg), tailwindPattern];
    const extra = rule.pkg === 'core' ? [reactPattern] : [];
    overrides.push(
      restrict(
        [`packages/${rule.pkg}/${rule.dir}/**`],
        [...base, ...extra, relativeDirPattern(rule.forbid, rule.message)],
      ),
    );
  }

  return overrides;
}
