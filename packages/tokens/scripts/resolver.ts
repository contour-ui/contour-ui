/**
 * Minimal reader for DTCG 2025.10 resolver files
 * (https://www.designtokens.org/tr/2025.10/resolver/). Style Dictionary 5 does
 * not understand resolvers yet, so the build expands one into plain file lists:
 * sets become Style Dictionary `include` files, the active modifier context
 * becomes `source` files (later sources override earlier ones, as in `resolutionOrder`).
 *
 * Supported subset: local file `$ref`s, any number of sets, exactly one modifier
 * (with a `default` context), sets ordered before the modifier.
 */
import path from 'node:path';

import { expectRecord, readJson } from './dtcg.ts';

export interface TokenFiles {
  readonly include: string[];
  readonly source: string[];
}

export interface ThemeResolver {
  readonly name: string;
  /** Modifier name, e.g. `theme`; becomes the `data-<modifier>` attribute in CSS. */
  readonly modifier: string;
  readonly contexts: readonly string[];
  readonly defaultContext: string;
  /** Absolute token file paths for one modifier context, in resolution order. */
  readonly files: (context: string) => TokenFiles;
}

function refList(value: unknown, what: string, baseDir: string): string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${what}: expected an array of { "$ref": "<file>" }.`);
  }
  return value.map((item: unknown, index) => {
    const ref = expectRecord(item, `${what}[${index}]`)['$ref'];
    if (typeof ref !== 'string' || ref.includes('#') || ref.includes('://')) {
      throw new TypeError(`${what}[${index}]: only local file $refs are supported.`);
    }
    return path.resolve(baseDir, ref);
  });
}

export function loadResolver(file: string): ThemeResolver {
  const baseDir = path.dirname(file);
  const doc = expectRecord(readJson(file), file);
  const sets = expectRecord(doc['sets'] ?? {}, `${file}: sets`);
  const modifiers = Object.entries(expectRecord(doc['modifiers'] ?? {}, `${file}: modifiers`));
  const [onlyModifier] = modifiers;
  if (onlyModifier === undefined || modifiers.length !== 1) {
    throw new Error(`${file}: exactly one modifier is supported (found ${modifiers.length}).`);
  }
  const [modifierName, modifierDef] = onlyModifier;
  const modifier = expectRecord(modifierDef, `${file}: modifiers.${modifierName}`);
  const contexts = expectRecord(
    modifier['contexts'],
    `${file}: modifiers.${modifierName}.contexts`,
  );
  const defaultContext = modifier['default'];
  if (typeof defaultContext !== 'string' || !Object.hasOwn(contexts, defaultContext)) {
    throw new Error(`${file}: modifiers.${modifierName} needs a "default" context.`);
  }

  const order = doc['resolutionOrder'];
  if (!Array.isArray(order)) {
    throw new TypeError(`${file}: resolutionOrder must be an array.`);
  }
  const include: string[] = [];
  let modifierSeen = false;
  for (const [index, item] of order.entries()) {
    const ref = expectRecord(item, `${file}: resolutionOrder[${index}]`)['$ref'];
    const setName = typeof ref === 'string' ? /^#\/sets\/(.+)$/u.exec(ref)?.[1] : undefined;
    if (setName !== undefined) {
      if (modifierSeen) {
        throw new Error(`${file}: sets must come before the modifier in resolutionOrder.`);
      }
      const set = expectRecord(sets[setName], `${file}: sets.${setName}`);
      include.push(...refList(set['sources'], `${file}: sets.${setName}.sources`, baseDir));
    } else if (ref === `#/modifiers/${modifierName}`) {
      modifierSeen = true;
    } else {
      throw new Error(`${file}: unsupported resolutionOrder entry ${JSON.stringify(item)}.`);
    }
  }
  if (!modifierSeen) {
    throw new Error(`${file}: resolutionOrder must reference #/modifiers/${modifierName}.`);
  }

  const name = doc['name'];
  return {
    name: typeof name === 'string' ? name : path.basename(file),
    modifier: modifierName,
    contexts: Object.keys(contexts),
    defaultContext,
    files: (context) => ({
      include,
      source: refList(contexts[context], `${file}: contexts.${context}`, baseDir),
    }),
  };
}
