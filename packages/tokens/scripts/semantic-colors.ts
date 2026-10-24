/**
 * Semantic color roles (`src/semantic/color.{dark,light}.tokens.json`) from one
 * mapping table, so both themes always define exactly the same set of roles.
 */
import { expectRecord, getPath, tokenValue } from './dtcg.ts';
import type { JsonRecord } from './dtcg.ts';
import { generatePalette } from './palette.ts';

/**
 * A base color, `hue.stop` in `base.color`, or a base color with its own alpha.
 * DTCG aliases cannot change alpha, so a translucent role copies the base color
 * (still regenerated from the palette on every `generate`).
 */
type RoleColor = string | { readonly color: string; readonly alpha: number };

/** [role, dark theme color, light theme color]. */
type RoleMapping = readonly [role: string, dark: RoleColor, light: RoleColor];

const NEUTRAL_ROLES: readonly RoleMapping[] = [
  ['bg.canvas', 'neutral.975', 'neutral.50'],
  ['bg.surface', 'neutral.950', 'neutral.0'],
  ['bg.raised', 'neutral.900', 'neutral.0'],
  ['bg.inset', 'neutral.975', 'neutral.100'],
  ['bg.hover', 'neutral.800', 'neutral.100'],
  ['fg.default', 'neutral.50', 'neutral.950'],
  ['fg.muted', 'neutral.300', 'neutral.700'],
  ['fg.subtle', 'neutral.400', 'neutral.600'],
  ['fg.disabled', 'neutral.600', 'neutral.300'],
  ['border.subtle', 'neutral.900', 'neutral.100'],
  ['border.default', 'neutral.800', 'neutral.200'],
  ['border.strong', 'neutral.600', 'neutral.500'],
  ['border.focus', 'blue.400', 'blue.600'],
];

/** Status roles share one shape; [role group, hue]. */
const STATUS: ReadonlyArray<readonly [string, string]> = [
  ['accent', 'blue'],
  ['danger', 'red'],
  ['success', 'green'],
  ['warning', 'yellow'],
];

const statusRoles = (role: string, hue: string): RoleMapping[] => [
  [`${role}.fill`, `${hue}.400`, `${hue}.600`],
  [`${role}.fill-hover`, `${hue}.300`, `${hue}.700`],
  [`${role}.on-fill`, 'neutral.975', 'neutral.0'],
  [`${role}.fg`, `${hue}.300`, `${hue}.700`],
  [`${role}.bg`, `${hue}.900`, `${hue}.50`],
  [`${role}.border`, `${hue}.600`, `${hue}.300`],
];

/**
 * The scrim fades the page toward the darkest neutral. On a dark page it needs
 * more coverage to dim content that is already dark.
 */
const OVERLAY_ROLES: readonly RoleMapping[] = [
  ['overlay.scrim', { color: 'neutral.975', alpha: 0.6 }, { color: 'neutral.975', alpha: 0.4 }],
];

/**
 * Code highlighting. Names are the variables of Shiki's `css-variables` theme
 * (`--shiki-token-<name>`). One hue per kind of token, on the stops of the
 * status `fg` roles (300 dark, 700 light); comments and punctuation stay
 * neutral. Every role is at least 4.5:1 on `bg.inset`, the code block background.
 */
const SYNTAX_ROLES: readonly RoleMapping[] = [
  ['syntax.constant', 'orange.300', 'orange.700'],
  ['syntax.string', 'yellow.300', 'yellow.700'],
  ['syntax.comment', 'neutral.400', 'neutral.700'],
  ['syntax.keyword', 'violet.300', 'violet.700'],
  ['syntax.parameter', 'red.300', 'red.700'],
  ['syntax.function', 'blue.300', 'blue.700'],
  ['syntax.string-expression', 'green.300', 'green.700'],
  ['syntax.punctuation', 'neutral.300', 'neutral.800'],
  ['syntax.link', 'cyan.300', 'cyan.700'],
];

export const ROLES: readonly RoleMapping[] = [
  ...NEUTRAL_ROLES,
  ...STATUS.flatMap(([role, hue]) => statusRoles(role, hue)),
  ...OVERLAY_ROLES,
  ...SYNTAX_ROLES,
];

const DESCRIPTIONS: Readonly<Record<string, string>> = {
  'bg.canvas': 'Plugin window background, the lowest layer.',
  'bg.surface': 'Panels and sections placed on the canvas.',
  'bg.raised': 'Menus, popovers, tooltips.',
  'bg.inset': 'Recessed wells: knob and slider tracks, meter backgrounds, displays.',
  'fg.subtle': 'Units, tick labels, secondary metadata.',
  'accent.on-fill': 'Text and icons placed on accent.fill.',
  'overlay.scrim': 'Translucent backdrop behind dialogs and drawers.',
  'syntax.constant': 'Numbers, language constants, constant and object names, CSS properties.',
  'syntax.string': 'Unquoted strings: shell arguments, Markdown code.',
  'syntax.comment': 'Comments.',
  'syntax.keyword': 'Keywords and storage modifiers, JSON keys.',
  'syntax.parameter': 'Function parameters.',
  'syntax.function': 'Functions, types and classes, JSX and HTML attributes.',
  'syntax.string-expression': 'Quoted and template strings, regular expressions, tag names.',
  'syntax.punctuation': 'Separators and argument punctuation.',
  'syntax.link': 'Links in Markdown.',
};

export type ThemeName = 'dark' | 'light';

const palette = getPath(generatePalette(), ['base', 'color'], 'base.color');

/** An alias of the base color, or a copy of it with the role's alpha. */
function roleValue(color: RoleColor): unknown {
  if (typeof color === 'string') {
    return `{base.color.${color}}`;
  }
  const base = tokenValue(getPath(palette, color.color.split('.'), color.color), color.color);
  return { ...expectRecord(base, color.color), alpha: color.alpha };
}

export function semanticColors(theme: ThemeName): JsonRecord {
  const color: Record<string, JsonRecord> = {};
  for (const [role, dark, light] of ROLES) {
    const [group = role, name = role] = role.split('.');
    const token: JsonRecord = { $value: roleValue(theme === 'dark' ? dark : light) };
    const description = DESCRIPTIONS[role];
    if (description !== undefined) {
      token['$description'] = description;
    }
    color[group] = { ...color[group], [name]: token };
  }
  return {
    $schema: 'https://www.designtokens.org/schemas/2025.10/format.json',
    color: { $type: 'color', ...color },
  };
}
