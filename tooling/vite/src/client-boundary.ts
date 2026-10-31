/**
 * The client boundary of a package under React Server Components (Next.js App Router): the modules
 * that need the browser start with `'use client'`, the others stay server modules, and the modules
 * an app calls on a server do nothing a server cannot run. Packages build with
 * `libraryPack({ unbundle: true })`, so every module of `dist` keeps the directive of its source.
 *
 * A module needs the browser when it:
 * - imports from `react` what its server build lacks (state and effect hooks, `createContext`,
 *   `use`), or anything from `react-dom`;
 * - passes an event handler in JSX (`onClick={…}`) or provides a context (`<ThemeContext value>`);
 * - takes a value other than a component (a hook, a function, an object) from a module that needs
 *   the browser, in its own package or in another workspace package. On a server, every export of
 *   a client module is a reference that can only be rendered: calling one throws, and reading
 *   inside one (`Card.Root`) throws too. Components (capitalized names) and namespaces of server
 *   modules (`export * as Card from './card/index.ts'`) are fine;
 * - renders a client component with `asChild`: the child it hands over must be an element the
 *   client can clone, and one a server sends may arrive as a lazy reference instead;
 * - calls a hook (`use…`) from a package outside the workspace, which this check cannot read.
 *
 * Calls to hooks a server has (`useMemo`, `useId`…) and to hooks built only on them keep a module
 * on the server: Primitive, for one, renders there.
 *
 * The check reads the imports of the modules the entry points reach. A line `import { … } from` is
 * a runtime import and an `import type` line never is: the lint keeps them apart
 * (`typescript/consistent-type-imports` with `separate-type-imports`, and
 * `import/consistent-type-specifier-style: prefer-top-level`). Workspace packages resolve through
 * the `@contour-ui/source` condition of their `exports`, to their sources.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { SOURCE_CONDITION } from './index.ts';

export interface ClientBoundaryOptions {
  /** The directory of the package: its `package.json` and `src/`. */
  readonly packageDir: string;
  /**
   * Modules an app calls on a server besides the entry points, relative to `src/`, such as a
   * function that returns a `<script>` for a root layout.
   */
  readonly serverModules?: readonly string[];
  /**
   * Modules that need the browser for a reason this check cannot see, relative to `src/`: they may
   * start with `'use client'` although nothing it reads asks for it. Say why in the module.
   */
  readonly clientModules?: readonly string[];
}

export interface ClientBoundaryModule {
  /** The path of the module, relative to `src/` of its package. */
  readonly file: string;
  readonly source: string;
  /** Whether its first statement is `'use client'` (a comment may only mention it). */
  readonly client: boolean;
}

export interface ClientBoundary {
  /** The entry points of the package, relative to `src/`. */
  readonly entries: readonly string[];
  /** The modules of the package that the entry points reach, by their path relative to `src/`. */
  readonly modules: ReadonlyMap<string, ClientBoundaryModule>;
  /** The names imported from the workspace that the check cannot find, and where. */
  unresolvedImports(): string[];
  /** The modules that need the browser but do not start with `'use client'`, and why. */
  missingDirectives(): string[];
  /** The modules that start with `'use client'` although they could run on a server. */
  needlessDirectives(): string[];
  /** What the modules an app calls on a server do that a server cannot run. */
  clientCodeOnServer(): string[];
}

/**
 * What `react` exports on a server (its `react-server` build), but `use`: packages read contexts
 * with it.
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

/** The comments of a module (and, rarely, a string with `//` in it: only for searching code). */
const COMMENTS = /\/\*[\s\S]*?\*\/|(?<!:)\/\/[^\n]*/gu;

/** An event handler in JSX, such as `onClick={…}`. */
const EVENT_HANDLER = /\s(on[A-Z]\w*)=\{/u;

/** A context provided in JSX, such as `<ThemeContext value={…}>` (or `.Provider`). */
const CONTEXT_PROVIDER = /<([\w$.]*Context(?:\.Provider)?)[\s>]/u;

/** A JSX element with `asChild` among its attributes: the tag, such as `Dialog.CloseTrigger`. */
const AS_CHILD_TAG = /<([\w$.]+)(?=[^<>]*?\sasChild\b)/gu;

/** A component, by the convention of its name: `Button`, not `useButton` or `BUTTON_SIZES`. */
const COMPONENT_NAME = /^[A-Z](?![\dA-Z_]*$)/u;

interface Specifier {
  /** The name in the other module: `default`, `*` (the whole module), or an export. */
  readonly imported: string;
  /** The name in this module (for an export, the name it exports); none for `export *`. */
  readonly local: string | undefined;
}

interface Statement {
  readonly kind: 'import' | 'export';
  readonly from: string;
  /** The module it reads, for a relative import or a workspace package. */
  readonly target: string | undefined;
  readonly specifiers: readonly Specifier[];
}

interface Module {
  /** The absolute path of the module. */
  readonly path: string;
  readonly source: string;
  /** The source without its comments. */
  readonly code: string;
  readonly client: boolean;
  readonly statements: readonly Statement[];
}

/** What an export of a module turns out to be. */
type Resolved =
  | { readonly kind: 'value'; readonly file: string; readonly name: string }
  | { readonly kind: 'namespace'; readonly file: string };

function specifiersOf(clause: string): Specifier[] {
  const specifiers: Specifier[] = [];
  const namespace = /^\*(?:\s+as\s+([\w$]+))?/u.exec(clause);
  if (namespace !== null) {
    specifiers.push({ imported: '*', local: namespace[1] });
  }
  const defaultName = /^([\w$]+)/u.exec(clause)?.[1];
  if (defaultName !== undefined) {
    specifiers.push({ imported: 'default', local: defaultName });
  }
  const named = /\{([^}]*)\}/u.exec(clause)?.[1] ?? '';
  for (const specifier of named.split(',')) {
    const [imported, local = imported] = specifier.trim().split(/\s+as\s+/u);
    if (imported !== undefined && imported !== '') {
      specifiers.push({ imported, local });
    }
  }
  return specifiers;
}

/** The directory of the nearest `package.json` above `file`. */
function packageDirOf(file: string): string {
  let dir = path.dirname(file);
  while (!existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`${file}: no package.json above it`);
    }
    dir = parent;
  }
  return dir;
}

interface PackageJson {
  readonly name: string | undefined;
  /** The sources the `exports` map points at under the source condition, by subpath. */
  readonly sources: ReadonlyMap<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPackageJson(dir: string): PackageJson {
  const json: unknown = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const name = isRecord(json) && typeof json['name'] === 'string' ? json['name'] : undefined;
  const sources = new Map<string, string>();
  const exports = isRecord(json) && isRecord(json['exports']) ? json['exports'] : {};
  for (const [subpath, target] of Object.entries(exports)) {
    const source = isRecord(target) ? target[SOURCE_CONDITION] : undefined;
    if (typeof source === 'string' && /\.tsx?$/u.test(source)) {
      sources.set(subpath, path.join(dir, source));
    }
  }
  return { name, sources };
}

/** The source of a workspace package's entry point that `from` names, as seen from `file`. */
function resolveWorkspace(file: string, from: string): string | undefined {
  const match = /^(@[^/]+\/[^/]+|[^@./][^/]*)(\/.*)?$/u.exec(from);
  if (match === null) {
    return undefined;
  }
  const [, name = '', subpath = ''] = match;
  const link = path.join(packageDirOf(file), 'node_modules', name);
  if (!existsSync(path.join(link, 'package.json'))) {
    return undefined;
  }
  return readPackageJson(realpathSync(link)).sources.get(`.${subpath}`);
}

/** Whether `source` declares its export `name` itself. */
function declares(source: string, name: string): boolean {
  if (name === 'default') {
    return /^export\s+default\b/mu.test(source);
  }
  return new RegExp(
    String.raw`^export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|enum)\s+${name}\b`,
    'mu',
  ).test(source);
}

/** Check the client boundary of the package in `packageDir`. */
export function clientBoundary({
  packageDir,
  serverModules = [],
  clientModules = [],
}: ClientBoundaryOptions): ClientBoundary {
  const srcDir = path.join(realpathSync(packageDir), 'src');
  const loaded = new Map<string, Module>();

  function load(file: string): Module {
    const cached = loaded.get(file);
    if (cached !== undefined) {
      return cached;
    }
    const source = readFileSync(file, 'utf8');
    const statements = [...source.matchAll(RUNTIME_IMPORT)].map(
      ([, kind, clause = '', from = '']): Statement => ({
        kind: kind === 'export' ? 'export' : 'import',
        from,
        target: from.startsWith('.')
          ? path.resolve(path.dirname(file), from)
          : resolveWorkspace(file, from),
        specifiers: specifiersOf(clause.trim()),
      }),
    );
    const client = /^['"]use client['"]/u.test(source.replace(LEADING_TRIVIA, ''));
    const code = source.replaceAll(COMMENTS, '');
    const module: Module = { path: file, source, code, client, statements };
    loaded.set(file, module);
    return module;
  }

  /** How a message names a module: relative to `src/`, or after its package in another one. */
  function display(file: string): string {
    if (file.startsWith(`${srcDir}${path.sep}`)) {
      return path.relative(srcDir, file);
    }
    const dir = packageDirOf(file);
    return `${readPackageJson(dir).name ?? dir}: ${path.relative(path.join(dir, 'src'), file)}`;
  }

  /** Where the export `name` of the module `file` comes from. */
  function resolveExport(
    file: string,
    name: string,
    seen = new Set<string>(),
  ): Resolved | undefined {
    if (seen.has(file)) {
      return undefined;
    }
    seen.add(file);
    const module = load(file);
    for (const { kind, target, specifiers } of module.statements) {
      const specifier = specifiers.find(({ local }) => local === name);
      if (kind === 'export' && target !== undefined && specifier !== undefined) {
        return specifier.imported === '*'
          ? { kind: 'namespace', file: target }
          : resolveExport(target, specifier.imported, seen);
      }
    }
    if (declares(module.source, name)) {
      return { kind: 'value', file, name };
    }
    for (const { kind, target, specifiers } of module.statements) {
      const star = specifiers.length === 1 && specifiers[0]?.local === undefined;
      if (kind === 'export' && target !== undefined && star) {
        const resolved = resolveExport(target, name, seen);
        if (resolved !== undefined) {
          return resolved;
        }
      }
    }
    return undefined;
  }

  /** What a JSX tag of `module` renders: an import of it, or a member of an imported namespace. */
  function resolveTag(module: Module, tag: string): Resolved | undefined {
    const [name, member] = tag.split('.');
    for (const { kind, target, specifiers } of module.statements) {
      const specifier = specifiers.find(({ local }) => local === name);
      if (kind !== 'import' || target === undefined || specifier === undefined) {
        continue;
      }
      const resolved =
        specifier.imported === '*'
          ? ({ kind: 'namespace', file: target } as const)
          : resolveExport(target, specifier.imported);
      if (member === undefined || resolved?.kind !== 'namespace') {
        return resolved;
      }
      return resolveExport(resolved.file, member);
    }
    return undefined;
  }

  const unresolved: string[] = [];
  const reasonsCache = new Map<string, readonly string[]>();
  const inProgress = new Set<string>();

  /** Whether the module `file` needs the browser: it says so, or it does what only a browser can. */
  function needsBrowser(file: string): boolean {
    return load(file).client || reasonsOf(file).length > 0;
  }

  /** The reason why taking `name`, resolved to `resolved`, needs the browser; none if it does not. */
  function valueReason(name: string, resolved: Resolved): string | undefined {
    if (resolved.kind === 'value' && !COMPONENT_NAME.test(name) && needsBrowser(resolved.file)) {
      return `takes ${name} from the client module ${display(resolved.file)}`;
    }
    return undefined;
  }

  /** What taking `imported` as `local` from the workspace module `target` makes `module` need. */
  function workspaceImportReasons(
    module: Module,
    {
      imported,
      local,
      from,
      target,
    }: { imported: string; local: string; from: string; target: string },
  ): string[] {
    const resolved =
      imported === '*'
        ? ({ kind: 'namespace', file: target } as const)
        : resolveExport(target, imported);
    if (resolved === undefined) {
      unresolved.push(`${display(module.path)}: ${imported} from ${from}`);
      return [];
    }
    if (resolved.kind === 'value') {
      return [valueReason(imported, resolved)].filter((reason) => reason !== undefined);
    }
    // A namespace of a server module is a plain object on a server too: check what is read inside
    // it.
    const members = new Set(
      [...module.code.matchAll(new RegExp(String.raw`\b${local}\.(\w+)`, 'gu'))].map(
        ([, member = '']) => member,
      ),
    );
    return [...members]
      .map((member) => {
        const inner = resolveExport(resolved.file, member);
        return inner === undefined ? undefined : valueReason(`${local}.${member}`, inner);
      })
      .filter((reason) => reason !== undefined);
  }

  /** What makes the module `file` need the browser, in words; none for a server module. */
  function reasonsOf(file: string): readonly string[] {
    const cached = reasonsCache.get(file);
    if (cached !== undefined) {
      return cached;
    }
    if (inProgress.has(file)) {
      // An import cycle: the other modules of the cycle decide.
      return [];
    }
    inProgress.add(file);
    const module = load(file);
    const reasons: string[] = [];
    // A re-export loads its module, as an import does, but hands its values on without using them.
    for (const { from, target, specifiers } of module.statements.filter(
      ({ kind }) => kind === 'import',
    )) {
      const names = specifiers.map(({ imported }) => imported);
      if (from === 'react') {
        const clientOnly = names.filter((name) => !SERVER_REACT.has(name));
        if (clientOnly.length > 0) {
          reasons.push(`imports ${clientOnly.join(', ')} from react, which a server lacks`);
        }
      } else if (from === 'react-dom' || from.startsWith('react-dom/')) {
        reasons.push(`imports ${names.join(', ')} from ${from}, which a server lacks`);
      } else if (target === undefined) {
        const hooks = names.filter((name) => /^use[A-Z]/u.test(name));
        if (hooks.length > 0) {
          reasons.push(`calls ${hooks.join(', ')} from ${from}`);
        }
      } else {
        for (const { imported, local = imported } of specifiers) {
          reasons.push(...workspaceImportReasons(module, { imported, local, from, target }));
        }
      }
    }
    for (const [, tag = ''] of module.code.matchAll(AS_CHILD_TAG)) {
      const resolved = resolveTag(module, tag);
      if (resolved?.kind === 'value' && needsBrowser(resolved.file)) {
        reasons.push(
          `renders the client component ${tag} with asChild: its child must be made on the client, ` +
            'where it can be cloned, not sent by a server',
        );
      }
    }
    const handler = EVENT_HANDLER.exec(module.code)?.[1];
    if (handler !== undefined) {
      reasons.push(`passes an event handler (${handler})`);
    }
    const context = CONTEXT_PROVIDER.exec(module.code)?.[1];
    if (context !== undefined) {
      reasons.push(`provides a context (${context})`);
    }
    inProgress.delete(file);
    const unique = [...new Set(reasons)];
    reasonsCache.set(file, unique);
    return unique;
  }

  const entries = [...readPackageJson(realpathSync(packageDir)).sources.values()].map((file) =>
    path.relative(srcDir, file),
  );

  /** The modules of the package, reached from the entry points through relative imports. */
  const own = new Map<string, Module>();
  function collect(file: string): void {
    const key = path.relative(srcDir, file);
    if (own.has(key) || key.startsWith('..')) {
      return;
    }
    const module = load(file);
    own.set(key, module);
    for (const { from, target } of module.statements) {
      if (from.startsWith('.') && target !== undefined) {
        collect(target);
      }
    }
  }
  for (const entry of entries) {
    collect(path.join(srcDir, entry));
  }

  const server = new Set([...entries, ...serverModules]);
  const modules = new Map(
    [...own].map(([file, { source, client }]) => [file, { file, source, client }] as const),
  );

  return {
    entries,
    modules,
    unresolvedImports() {
      for (const file of own.keys()) {
        reasonsOf(path.join(srcDir, file));
      }
      return [...new Set(unresolved)];
    },
    missingDirectives() {
      const missing: string[] = [];
      for (const [file, module] of own) {
        const reasons = reasonsOf(module.path);
        if (!module.client && !server.has(file) && reasons.length > 0) {
          missing.push(`${file}: start it with 'use client': it ${reasons.join('; it ')}`);
        }
      }
      return missing;
    },
    needlessDirectives() {
      return [...own]
        .filter(
          ([file, module]) =>
            module.client && !clientModules.includes(file) && reasonsOf(module.path).length === 0,
        )
        .map(([file]) => `${file}: nothing in it needs the browser: remove 'use client'`);
    },
    clientCodeOnServer() {
      const problems: string[] = [];
      for (const file of server) {
        const module = own.get(file);
        if (module === undefined) {
          problems.push(`${file}: an app calls it on a server, but no entry point reaches it`);
          continue;
        }
        if (module.client) {
          problems.push(`${file}: an app calls it on a server: remove 'use client'`);
        }
        for (const reason of reasonsOf(module.path)) {
          problems.push(`${file}: an app calls it on a server, but it ${reason}`);
        }
      }
      return problems;
    },
  };
}

/**
 * Register the tests of the client boundary of the package in `packageDir` (see
 * {@link clientBoundary}), for a Vitest project in the Node environment. Returns the boundary, for
 * the package's own checks.
 *
 * @example
 * // src/client-boundary.test.ts
 * describeClientBoundary({ packageDir: path.join(import.meta.dirname, '..') });
 */
export function describeClientBoundary(options: ClientBoundaryOptions): ClientBoundary {
  const boundary = clientBoundary(options);
  describe('the client boundary (React Server Components)', () => {
    it('reaches the entry points and the modules an app calls on a server', () => {
      expect(boundary.entries).toContain('index.ts');
      expect((options.serverModules ?? []).filter((file) => !boundary.modules.has(file))).toEqual(
        [],
      );
    });

    it('finds every name it imports from the workspace', () => {
      expect(boundary.unresolvedImports()).toEqual([]);
    });

    it('starts every module that needs the browser with use client', () => {
      expect(boundary.missingDirectives()).toEqual([]);
    });

    it('keeps every other module a server module', () => {
      expect(boundary.needlessDirectives()).toEqual([]);
    });

    it('keeps the modules an app calls on a server free of client code', () => {
      expect(boundary.clientCodeOnServer()).toEqual([]);
    });
  });
  return boundary;
}
