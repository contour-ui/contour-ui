/**
 * The export conditions of the built packages, checked after `vp run -r build`.
 *
 * attw and publint read one branch of an `exports` map: a `soundor` branch that points at a file
 * the build did not write ships unnoticed. This resolves every subpath of the published `exports`
 * (`publishConfig.exports`) under the conditions of each platform, as a bundler and TypeScript
 * would, and checks that the files exist and that each JavaScript file has its declarations next
 * to it. It also checks the order of the platform keys: `types` first, the specific platforms
 * before `default`, or a bundler that sets several conditions takes the wrong branch. The same goes
 * for the `#platform/*` modules of a package's `imports`: each build of each module exists.
 *
 * Run: `vp run exports` (or `node scripts/check-exports.ts`), after the packages are built.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { LAYERS } from './layers.ts';

/** The conditions of each platform's bundler, besides `import` and `default`. */
const PLATFORMS: Readonly<Record<string, readonly string[]>> = {
  web: ['browser'],
  soundor: ['soundor'],
};

/** The order the platform keys keep in a conditional target: specific first, `default` last. */
const KEY_ORDER = ['types', 'soundor', 'browser', 'react-native', 'import', 'default'];

const root = path.join(import.meta.dirname, '..');
let failures = 0;

function fail(pkg: string, message: string): void {
  console.error(`✘ @contour-ui/${pkg}: ${message}`);
  failures += 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The target `conditions` pick, as Node's resolution walks a conditional object: keys in order. */
function resolveTarget(target: unknown, conditions: readonly string[]): string | undefined {
  if (typeof target === 'string') {
    return target;
  }
  if (!isRecord(target)) {
    return undefined;
  }
  for (const [key, value] of Object.entries(target)) {
    if (key === 'default' || conditions.includes(key)) {
      const resolved = resolveTarget(value, conditions);
      if (resolved !== undefined) {
        return resolved;
      }
    }
  }
  return undefined;
}

/** Every conditional object in a target, for the order of its keys. */
function* conditionalObjects(target: unknown): Generator<Record<string, unknown>> {
  if (!isRecord(target)) {
    return;
  }
  yield target;
  for (const value of Object.values(target)) {
    yield* conditionalObjects(value);
  }
}

function checkOrder(pkg: string, at: string, target: unknown): void {
  for (const object of conditionalObjects(target)) {
    const keys = Object.keys(object).filter((key) => KEY_ORDER.includes(key));
    const sorted = keys.toSorted((a, b) => KEY_ORDER.indexOf(a) - KEY_ORDER.indexOf(b));
    if (keys.join() !== sorted.join()) {
      fail(pkg, `${at}: conditions in the order ${sorted.join(', ')}, not ${keys.join(', ')}.`);
    }
  }
}

/** The declarations of a JavaScript file: `x.js` → `x.d.ts`. */
const declarationsOf = (file: string): string => file.replace(/\.js$/u, '.d.ts');

function checkTarget(pkg: string, dir: string, at: string, target: unknown): void {
  checkOrder(pkg, at, target);
  for (const [platform, extra] of Object.entries(PLATFORMS)) {
    const js = resolveTarget(target, ['import', ...extra]);
    if (js === undefined) {
      fail(pkg, `${at}: nothing for the ${platform}.`);
      continue;
    }
    if (!existsSync(path.join(dir, js))) {
      fail(pkg, `${at}: the ${platform} build ${js} is missing (built?).`);
      continue;
    }
    if (!js.endsWith('.js')) {
      continue;
    }
    const types = resolveTarget(target, ['types', 'import', ...extra]);
    if (types !== declarationsOf(js)) {
      fail(pkg, `${at}: the ${platform} types are ${types ?? 'none'}, not ${declarationsOf(js)}.`);
    } else if (!existsSync(path.join(dir, types))) {
      fail(pkg, `${at}: the ${platform} types ${types} are missing.`);
    }
  }
}

/** The files a pattern target (`./dist/platform/*.web.js`) matches: one per module. */
function patternMatches(dir: string, pattern: string): string[] {
  const [before = '', after = ''] = pattern.split('*');
  const slash = before.lastIndexOf('/');
  const folder = path.join(dir, before.slice(0, slash));
  const prefix = before.slice(slash + 1);
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder)
    .filter((name) => name.startsWith(prefix) && name.endsWith(after))
    .map((name) => name.slice(prefix.length, name.length - after.length));
}

/**
 * A subpath of `exports` or `imports`: a plain one, or a pattern (`./ttf/*`, `#platform/*`), checked
 * for every file its web build matches.
 */
function checkEntry(pkg: string, dir: string, field: string, key: string, target: unknown): void {
  const at = `${field}["${key}"]`;
  if (!key.includes('*')) {
    checkTarget(pkg, dir, at, target);
    return;
  }
  checkOrder(pkg, at, target);
  const web = resolveTarget(target, ['import']);
  const names = web === undefined ? [] : patternMatches(dir, web);
  if (names.length === 0) {
    fail(pkg, `${at}: no file of the web build (built?).`);
  }
  for (const name of names) {
    // The name of one file in place of the star: a JSON string, so no quote needs escaping.
    const concrete: unknown = JSON.parse(JSON.stringify(target).replaceAll('*', name));
    checkTarget(pkg, dir, `${field}["${key.replace('*', name)}"]`, concrete);
  }
}

let packages = 0;
for (const { name } of LAYERS) {
  const dir = path.join(root, 'packages', name);
  const json: unknown = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  if (!isRecord(json) || !isRecord(json['publishConfig'])) {
    continue;
  }
  const exports = json['publishConfig']['exports'];
  if (!isRecord(exports)) {
    fail(name, 'publishConfig.exports is missing.');
    continue;
  }
  packages += 1;
  for (const [subpath, target] of Object.entries(exports)) {
    if (subpath !== './package.json') {
      checkEntry(name, dir, 'exports', subpath, target);
    }
  }
  const imports = json['imports'];
  for (const [specifier, target] of Object.entries(isRecord(imports) ? imports : {})) {
    checkEntry(name, dir, 'imports', specifier, target);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`✔ Export conditions OK (${packages} packages, every platform).`);
}
