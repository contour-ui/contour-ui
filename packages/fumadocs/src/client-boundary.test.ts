/**
 * The package under React Server Components (Next.js App Router): the modules that need the
 * browser start with `'use client'`, the modules an app calls on a server stay server modules, and
 * no module brings a router of its own. `vp pack` builds the package unbundled, so every module of
 * `dist` keeps the directive of its source.
 *
 * The rules read the imports of the modules the entry points reach. A line `import { … } from`
 * is a runtime import and an `import type` line never is: the lint keeps them apart
 * (`typescript/consistent-type-imports` with `separate-type-imports`, and
 * `import/consistent-type-specifier-style: prefer-top-level`).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

/** The entry points of the package: the sources `exports` maps in `package.json`, from `src/`. */
const ENTRIES = [
  ...readFileSync(path.join(import.meta.dirname, '../package.json'), 'utf8').matchAll(
    /"@contour-ui\/source": "\.\/src\/([^"]+\.tsx?)"/gu,
  ),
].map(([, entry = '']) => entry);

/**
 * The modules an app calls on a server: the entry points, `docsScript()` in a root layout, and
 * `getMdxComponents()` where MDX renders.
 */
const SERVER_MODULES = new Set([
  ...ENTRIES,
  'provider/docs-script.ts',
  'mdx/get-mdx-components.tsx',
]);

/**
 * Packages that cannot load on a server: their bundles create React contexts as they load.
 * `@contour-ui/kit/theme-script` can.
 */
const CLIENT_PACKAGES = new Set(['@contour-ui/kit', '@contour-ui/headless']);

/**
 * What `react` exports on a server (its `react-server` build), but `use`: the package reads
 * contexts with it.
 */
const SERVER_REACT = new Set([
  'Activity',
  'Children',
  'Fragment',
  'Profiler',
  'StrictMode',
  'Suspense',
  'ViewTransition',
  'cache',
  'cacheSignal',
  'captureOwnerStack',
  'cloneElement',
  'createElement',
  'createRef',
  'forwardRef',
  'isValidElement',
  'lazy',
  'memo',
  'useCallback',
  'useDebugValue',
  'useId',
  'useMemo',
  'version',
]);

/** The comments and white space before the first statement of a module. */
const LEADING_TRIVIA = /^(?:\s+|\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*/u;

/** A runtime `import … from '…';` or `export … from '…';` (its clause may span lines). */
const RUNTIME_IMPORT = /^(import|export)\s+(?!type\s)([^;'"]*?)\s+from\s+'([^']+)';/gmu;

/** Any import of a router package, type-only ones included. */
const ROUTER_IMPORT = /\bfrom\s+'((?:@react-router\/|react-router)[^']*)'/gu;

/** An event handler in JSX, such as `onClick={…}`. */
const EVENT_HANDLER = /\s(on[A-Z]\w*)=\{/u;

interface Import {
  readonly kind: 'import' | 'export';
  /** The names the module takes: `default`, `*`, or the exported names (before any `as`). */
  readonly names: readonly string[];
  readonly from: string;
}

interface Module {
  /** The path of the module, relative to `src/`. */
  readonly file: string;
  readonly source: string;
  /** Whether its first statement is `'use client'` (a comment may only mention it). */
  readonly client: boolean;
  readonly imports: readonly Import[];
}

function importedNames(clause: string): string[] {
  const names: string[] = [];
  if (clause.startsWith('*')) {
    names.push('*');
  } else if (/^[\w$]/u.test(clause)) {
    names.push('default');
  }
  const specifiers = /\{([^}]*)\}/u.exec(clause)?.[1] ?? '';
  for (const specifier of specifiers.split(',')) {
    const name = specifier.trim().split(/\s+as\s+/u)[0];
    if (name !== undefined && name !== '') {
      names.push(name);
    }
  }
  return names;
}

/** The modules of the package, by their path relative to `src/`. */
const modules = new Map<string, Module>();

/** Add the module at `file` and every module it reaches through relative imports. */
function collect(file: string): void {
  if (modules.has(file)) {
    return;
  }
  const source = readFileSync(path.join(import.meta.dirname, file), 'utf8');
  const imports = [...source.matchAll(RUNTIME_IMPORT)].map(
    ([, kind, clause = '', from = '']): Import => ({
      kind: kind === 'export' ? 'export' : 'import',
      names: importedNames(clause.trim()),
      from,
    }),
  );
  const client = /^['"]use client['"]/u.test(source.replace(LEADING_TRIVIA, ''));
  modules.set(file, { file, source, client, imports });
  for (const { from } of imports) {
    if (from.startsWith('.')) {
      collect(path.join(path.dirname(file), from));
    }
  }
}

for (const entry of ENTRIES) {
  collect(entry);
}

/** What makes `module` need the browser, in words; none for a module that runs on a server. */
function clientReasons({ source, imports }: Module): string[] {
  const reasons: string[] = [];
  for (const { kind, names, from } of imports) {
    // A re-export loads its module as an import does, but hands the value on without using it.
    if (CLIENT_PACKAGES.has(from)) {
      const verb = kind === 'export' ? 're-exports' : 'imports';
      reasons.push(`${verb} ${names.join(', ')} from ${from}, which cannot load on a server`);
    } else if (kind === 'import' && from === 'react') {
      const clientOnly = names.filter((name) => !SERVER_REACT.has(name));
      if (clientOnly.length > 0) {
        reasons.push(`imports ${clientOnly.join(', ')} from react, which a server lacks`);
      }
    } else if (kind === 'import') {
      const hooks = names.filter((name) => /^use[A-Z]/u.test(name));
      if (hooks.length > 0) {
        reasons.push(`calls ${hooks.join(', ')} from ${from}`);
      }
    }
  }
  const handler = EVENT_HANDLER.exec(source)?.[1];
  if (handler !== undefined) {
    reasons.push(`passes an event handler (${handler})`);
  }
  return reasons;
}

/** The modules that need the browser but do not start with `'use client'`, and why. */
function missingDirectives(): string[] {
  const missing: string[] = [];
  for (const module of modules.values()) {
    const reasons = clientReasons(module);
    if (!module.client && !SERVER_MODULES.has(module.file) && reasons.length > 0) {
      missing.push(`${module.file}: start it with 'use client': it ${reasons.join('; it ')}`);
    }
  }
  return missing;
}

/** What the modules an app calls on a server do that a server cannot run. */
function clientCodeOnServer(): string[] {
  const problems: string[] = [];
  for (const file of SERVER_MODULES) {
    const module = modules.get(file);
    if (module?.client === true) {
      problems.push(`${file}: an app calls it on a server: remove 'use client'`);
    }
    for (const reason of module === undefined ? [] : clientReasons(module)) {
      problems.push(`${file}: an app calls it on a server, but it ${reason}`);
    }
    for (const { kind, names, from } of module?.imports ?? []) {
      const target = from.startsWith('.')
        ? modules.get(path.join(path.dirname(file), from))
        : undefined;
      // On a server, every export of a client module is a reference it can only render: calling
      // one throws, and spreading one yields nothing.
      const values = names.filter((name) => !/^[A-Z]/u.test(name));
      if (kind === 'import' && target?.client === true && values.length > 0) {
        problems.push(
          `${file}: takes ${values.join(', ')} from the client module ${target.file}, ` +
            'where a server can only render components',
        );
      }
    }
  }
  return problems;
}

describe('the client boundary (React Server Components)', () => {
  it('reaches the entry points and the modules an app calls on a server', () => {
    expect(ENTRIES).toContain('index.ts');
    expect([...SERVER_MODULES].filter((file) => !modules.has(file))).toEqual([]);
  });

  it('starts every module that needs the browser with use client', () => {
    expect(missingDirectives()).toEqual([]);
  });

  it('keeps the modules an app calls on a server free of client code', () => {
    expect(clientCodeOnServer()).toEqual([]);
  });

  it('imports no router: links and navigation come from fumadocs-core/framework', () => {
    const routers = [...modules.values()].flatMap(({ file, source }) =>
      [...source.matchAll(ROUTER_IMPORT)].map(([, from]) => `${file}: imports ${from}`),
    );

    expect(routers).toEqual([]);
  });
});
