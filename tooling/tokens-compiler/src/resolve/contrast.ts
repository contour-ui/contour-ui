/**
 * The contrast pairs of the design: a JSON file beside the token sources, read with them.
 *
 *   { "pairs": [{ "foreground": "color.fg.default", "background": "color.bg.surface", "minimum": 7 }] }
 *
 * A foreground ending in `.*` stands for every color of its group. `kind` is `text` (the default)
 * or `ui`, a part of the interface such as a border; a `minimum` of `null` or none marks a pair
 * WCAG exempts, such as disabled text, which is measured but holds to no ratio.
 */
import path from 'node:path';

import { expectRecord } from '../model/dtcg.ts';
import type { ContrastPair, ModelToken } from '../model/model.ts';
import type { Report } from '../model/problem.ts';
import type { SourceReader } from './resolve.ts';

const SOURCE = 'contrast';

/** The color tokens a foreground stands for: one id, or every color of a group for `group.*`. */
function foregrounds(tokens: readonly ModelToken[], pattern: string): readonly ModelToken[] {
  if (!pattern.endsWith('.*')) {
    return tokens.filter((token) => token.id === pattern);
  }
  const group = pattern.slice(0, -2).split('.');
  return tokens.filter(
    (token) =>
      token.type === 'color' &&
      token.path.length === group.length + 1 &&
      group.every((segment, index) => token.path[index] === segment),
  );
}

/** The pairs of `file`, expanded and checked against the tokens; problems for the rest. */
export function readContrastPairs(
  file: string,
  tokens: readonly ModelToken[],
  reader: SourceReader,
  report: Report,
): ContrastPair[] {
  const name = path.basename(file);
  const pairs = expectRecord(reader.readJson(file), name)['pairs'];
  if (!Array.isArray(pairs)) {
    throw new TypeError(
      `${name}: expected "pairs", a list of { foreground, background, minimum }.`,
    );
  }
  const isColor = (id: string): boolean =>
    tokens.some((token) => token.id === id && token.type === 'color');
  return pairs.flatMap((item: unknown, index): ContrastPair[] => {
    const where = `${name}: pairs[${index}]`;
    const { foreground, background, minimum = null, kind = 'text' } = expectRecord(item, where);
    if (typeof foreground !== 'string' || typeof background !== 'string') {
      throw new TypeError(`${where} needs a foreground and a background.`);
    }
    if ((typeof minimum !== 'number' && minimum !== null) || (kind !== 'text' && kind !== 'ui')) {
      throw new TypeError(`${where}: minimum is a number or null, kind "text" or "ui".`);
    }
    const matched = foregrounds(tokens, foreground);
    const missing = [
      ...(matched.length === 0 || matched.some((token) => token.type !== 'color')
        ? [foreground]
        : []),
      ...(isColor(background) ? [] : [background]),
    ];
    for (const id of missing) {
      report({ source: SOURCE, message: `${where}: ${id} is no color token.` });
    }
    return missing.length > 0
      ? []
      : matched.map((token) => ({
          foreground: token.id,
          background,
          kind,
          minimum: minimum ?? undefined,
        }));
  });
}
