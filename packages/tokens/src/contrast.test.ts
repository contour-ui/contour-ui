/**
 * WCAG 2 contrast for the semantic color pairs components actually use, in both
 * themes. Fails when a palette or role change breaks a target ratio.
 */
import { wcagContrast } from 'culori';
import { describe, expect, it } from 'vite-plus/test';

import {
  aliasPath,
  getPath,
  groupEntries,
  parseColor,
  readJson,
  tokenValue,
} from '../scripts/dtcg.ts';
import { PALETTE_FILE, semanticColorFile } from '../scripts/paths.ts';
import { defaultTheme, themes } from './index.ts';
import type { Theme } from './index.ts';

const STATUS_ROLES = ['accent', 'danger', 'success', 'warning'] as const;

/** Every `color.syntax.*` role: highlighted code is text on the code block background, `bg.inset`. */
const SYNTAX_ROLES = groupEntries(
  getPath(readJson(semanticColorFile(defaultTheme)), ['color', 'syntax'], 'color.syntax'),
  'color.syntax',
).map(([name]) => `syntax.${name}`);

/** [foreground role, background role, minimum ratio]. */
const PAIRS: ReadonlyArray<readonly [string, string, number]> = [
  ['fg.default', 'bg.canvas', 7],
  ['fg.default', 'bg.surface', 7],
  ['fg.default', 'bg.raised', 7],
  ['fg.muted', 'bg.surface', 4.5],
  ['fg.muted', 'bg.raised', 4.5],
  ['fg.subtle', 'bg.surface', 3],
  ['fg.subtle', 'bg.inset', 3],
  ['border.strong', 'bg.surface', 3],
  ['border.focus', 'bg.surface', 3],
  ['border.focus', 'bg.inset', 3],
  ...STATUS_ROLES.flatMap((role): Array<readonly [string, string, number]> => [
    [`${role}.on-fill`, `${role}.fill`, 4.5],
    [`${role}.fg`, `${role}.bg`, 4.5],
    [`${role}.fg`, 'bg.surface', 4.5],
    [`${role}.fill`, 'bg.inset', 3],
  ]),
  ['accent.fill', 'bg.surface', 3],
  ...SYNTAX_ROLES.map((role): readonly [string, string, number] => [role, 'bg.inset', 4.5]),
];

const palette = getPath(readJson(PALETTE_FILE), ['base', 'color'], 'base.color');

function hexOf(theme: Theme, role: string): string {
  const roles = getPath(readJson(semanticColorFile(theme)), ['color'], `color.${theme}`);
  const ref = tokenValue(getPath(roles, role.split('.'), role), role);
  const target = aliasPath(ref);
  if (target?.[0] !== 'base' || target[1] !== 'color') {
    throw new Error(`${theme} ${role}: expected an alias to base.color, got ${String(ref)}.`);
  }
  const color = parseColor(tokenValue(getPath(palette, target.slice(2), role), role), role);
  if (color.hex === undefined) {
    throw new Error(`${target.join('.')}: missing hex fallback.`);
  }
  return color.hex;
}

describe.each(themes)('%s theme', (theme) => {
  it.each(PAIRS)('%s on %s ≥ %d:1', (foreground, background, minimum) => {
    expect(wcagContrast(hexOf(theme, foreground), hexOf(theme, background))).toBeGreaterThanOrEqual(
      minimum,
    );
  });
});
