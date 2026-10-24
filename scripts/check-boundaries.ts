/**
 * Layer boundary check for declared dependencies and CSS.
 *
 * Complements oxlint `no-restricted-imports` (which only sees JS/TS imports):
 * - every `dependencies` / `peerDependencies` / `devDependencies` /
 *   `optionalDependencies` entry must respect the layer table, even when nothing
 *   imports it yet;
 * - `react` / `react-dom` must be declared with the right kind per package;
 * - CSS `@import` / `@plugin` / `@reference` must not reach forbidden packages;
 * - the dev `exports` map and `publishConfig.exports` must stay in sync.
 *
 * Run: `vp run boundaries` (or `node scripts/check-boundaries.ts`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  FORBIDDEN_EXTERNALS,
  LAYERS,
  SCOPE,
  SOURCE_CONDITION,
  TOOLING_PACKAGES,
  getLayer,
  scoped,
} from './layers.ts';
import type { LayerPackage } from './layers.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const DEPENDENCY_FIELDS = [
  'dependencies',
  'peerDependencies',
  'devDependencies',
  'optionalDependencies',
] as const;

type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

interface PackageJson {
  readonly name?: string;
  readonly private?: boolean;
  readonly exports?: unknown;
  readonly publishConfig?: { readonly access?: string; readonly exports?: unknown };
  readonly peerDependenciesMeta?: Readonly<Record<string, { readonly optional?: boolean }>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
}

const violations: string[] = [];

const relative = (file: string): string => path.relative(ROOT, file);

function report(file: string, message: string): void {
  violations.push(`${relative(file)}: ${message}`);
}

function isForbiddenExternal(specifier: string): boolean {
  return FORBIDDEN_EXTERNALS.some((pattern) =>
    pattern.endsWith('/*')
      ? specifier.startsWith(pattern.slice(0, -1))
      : specifier === pattern || specifier.startsWith(`${pattern}/`),
  );
}

/** `@contour-ui/kit/styles.css` -> `kit`; anything else -> undefined. */
function internalName(specifier: string): string | undefined {
  if (!specifier.startsWith(`${SCOPE}/`)) {
    return undefined;
  }
  return specifier.slice(SCOPE.length + 1).split('/')[0];
}

function allowedText(pkg: LayerPackage): string {
  return pkg.allowed.length > 0
    ? pkg.allowed.map((name) => scoped(name)).join(', ')
    : 'no internal packages';
}

// ---------------------------------------------------------------------------
// package.json checks
// ---------------------------------------------------------------------------

function checkInternalDependency(
  file: string,
  pkg: LayerPackage,
  field: DependencyField,
  dependency: string,
): void {
  const name = internalName(dependency);
  if (name === undefined) {
    return;
  }
  if (TOOLING_PACKAGES.includes(name)) {
    if (field !== 'devDependencies') {
      report(file, `${dependency} is private tooling; declare it in devDependencies only.`);
    }
    return;
  }
  if (getLayer(name) === undefined) {
    report(
      file,
      `${field}.${dependency} is not a published layer package (apps and unknown packages are off-limits).`,
    );
    return;
  }
  if (name === pkg.name || !pkg.allowed.includes(name)) {
    report(
      file,
      `layer violation: ${field}.${dependency} — ${scoped(pkg.name)} (layer ${pkg.layer}) may only depend on ${allowedText(pkg)}.`,
    );
  }
}

function checkReact(file: string, pkg: LayerPackage, json: PackageJson): void {
  const peers = json.peerDependencies ?? {};
  const optional = (dependency: string): boolean =>
    json.peerDependenciesMeta?.[dependency]?.optional === true;

  for (const dependency of ['react', 'react-dom']) {
    for (const field of ['dependencies', 'optionalDependencies'] as const) {
      if (json[field]?.[dependency] !== undefined) {
        report(file, `${dependency} must never be a regular dependency (found in ${field}).`);
      }
    }
  }

  switch (pkg.react) {
    case 'peer': {
      for (const dependency of ['react', 'react-dom']) {
        if (peers[dependency] === undefined) {
          report(file, `${dependency} must be declared in peerDependencies.`);
        } else if (optional(dependency)) {
          report(file, `${dependency} must be a required (non-optional) peer.`);
        }
      }
      break;
    }
    case 'optional-peer': {
      if (peers['react'] === undefined || !optional('react')) {
        report(
          file,
          'react must be an optional peer (peerDependencies + peerDependenciesMeta.react.optional).',
        );
      }
      if (peers['react-dom'] !== undefined) {
        report(file, 'react-dom must not be a peer: core has no DOM.');
      }
      break;
    }
    case 'none': {
      for (const dependency of ['react', 'react-dom']) {
        if (peers[dependency] !== undefined) {
          report(file, `${dependency} must not be a peer of ${scoped(pkg.name)}.`);
        }
      }
      break;
    }
  }
}

/** Drop the source condition; collapse `{ default: x }` to `x`. */
function stripSourceCondition(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const entries = Object.entries(value)
    .filter(([key]) => key !== SOURCE_CONDITION)
    .map(([key, nested]) => [key, stripSourceCondition(nested)] as const);
  const [only] = entries;
  if (entries.length === 1 && only?.[0] === 'default') {
    return only[1];
  }
  return Object.fromEntries(entries);
}

function checkTypesFirst(file: string, value: unknown, at: string): void {
  if (typeof value !== 'object' || value === null) {
    return;
  }
  const keys = Object.keys(value);
  if (keys.includes('types') && keys[0] !== 'types') {
    report(file, `publishConfig.exports${at}: "types" must be the first condition.`);
  }
  for (const [key, nested] of Object.entries(value)) {
    checkTypesFirst(file, nested, `${at}["${key}"]`);
  }
}

function checkExports(file: string, json: PackageJson): void {
  const published = json.publishConfig?.exports;
  if (json.publishConfig?.access !== 'public') {
    report(file, 'publishConfig.access must be "public".');
  }
  if (published === undefined) {
    report(
      file,
      'publishConfig.exports is missing (published exports without the source condition).',
    );
    return;
  }
  if (JSON.stringify(stripSourceCondition(json.exports)) !== JSON.stringify(published)) {
    report(
      file,
      `publishConfig.exports must equal "exports" without the "${SOURCE_CONDITION}" condition.`,
    );
  }
  checkTypesFirst(file, published, '');
}

function isPackageJson(value: unknown): value is PackageJson {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkPackageJson(dir: string, pkg: LayerPackage): void {
  const file = path.join(dir, 'package.json');
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isPackageJson(parsed)) {
    report(file, 'not a JSON object.');
    return;
  }
  const json = parsed;

  if (json.name !== scoped(pkg.name)) {
    report(file, `name must be ${scoped(pkg.name)} (got ${String(json.name)}).`);
  }
  if (json.private === true) {
    report(file, 'layer packages are published; remove "private".');
  }

  for (const field of DEPENDENCY_FIELDS) {
    for (const dependency of Object.keys(json[field] ?? {})) {
      checkInternalDependency(file, pkg, field, dependency);
      if (isForbiddenExternal(dependency)) {
        report(
          file,
          `${field}.${dependency}: no Tailwind in packages (CSS + token variables only).`,
        );
      }
    }
  }

  checkReact(file, pkg, json);
  checkExports(file, json);
}

// ---------------------------------------------------------------------------
// CSS checks (oxlint does not lint CSS)
// ---------------------------------------------------------------------------

const CSS_IMPORT = /@(?:import|plugin|reference)\s+(?:url\(\s*)?["']?([^"')\s;]+)/gu;

function listFiles(dir: string, extension: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((entry) => path.join(dir, entry))
    .filter(
      (file) => file.endsWith(extension) && !file.includes(`${path.sep}node_modules${path.sep}`),
    )
    .filter((file) => statSync(file).isFile());
}

function checkCss(dir: string, pkg: LayerPackage): void {
  const srcDir = path.join(dir, 'src');
  for (const file of listFiles(srcDir, '.css')) {
    const css = readFileSync(file, 'utf8');
    for (const match of css.matchAll(CSS_IMPORT)) {
      const specifier = match[1] ?? '';
      const name = internalName(specifier);
      if (name !== undefined && name !== pkg.name && !pkg.allowed.includes(name)) {
        report(
          file,
          `layer violation: CSS imports ${specifier} — ${scoped(pkg.name)} may only depend on ${allowedText(pkg)}.`,
        );
      } else if (isForbiddenExternal(specifier)) {
        report(file, `CSS imports ${specifier}: no Tailwind in packages.`);
      } else if (specifier.startsWith('.')) {
        const target = path.resolve(path.dirname(file), specifier);
        if (!target.startsWith(`${dir}${path.sep}`)) {
          report(
            file,
            `CSS imports ${specifier}, which escapes the package; import by package name.`,
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Changesets: every published package is in the single `fixed` group
// ---------------------------------------------------------------------------

function checkChangesets(): void {
  const file = path.join(ROOT, '.changeset', 'config.json');
  const config: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const fixed =
    typeof config === 'object' && config !== null && 'fixed' in config ? config.fixed : undefined;
  const expected = LAYERS.map((pkg) => scoped(pkg.name)).toSorted();
  const groups: unknown[] = Array.isArray(fixed) ? fixed : [];
  const [group] = groups;
  const actual: unknown[] = groups.length === 1 && Array.isArray(group) ? group : [];
  if (JSON.stringify(actual.map(String).toSorted()) !== JSON.stringify(expected)) {
    report(file, `"fixed" must be exactly one group with ${expected.join(', ')}.`);
  }
}

// ---------------------------------------------------------------------------

checkChangesets();

const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .toSorted();

for (const dirName of packageDirs) {
  const dir = path.join(PACKAGES_DIR, dirName);
  const pkg = getLayer(dirName);
  if (pkg === undefined) {
    report(
      path.join(dir, 'package.json'),
      `packages/${dirName} is not in the layer table (scripts/layers.ts).`,
    );
    continue;
  }
  checkPackageJson(dir, pkg);
  checkCss(dir, pkg);
}

if (violations.length > 0) {
  console.error(`✖ Layer boundary check failed (${violations.length}):\n`);
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  console.error('\nSee AGENTS.md ("Layers") and scripts/layers.ts.');
  process.exitCode = 1;
} else {
  console.log(`✔ Layer boundaries OK (${packageDirs.length} packages, ${LAYERS.length} layers).`);
}
