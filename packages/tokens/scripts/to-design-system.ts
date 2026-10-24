/**
 * Convert the DTCG sources into the list-shaped `tokens.json` the Design System
 * page reads. Token names match the built CSS variables without the leading `--`.
 *
 *   vp run --filter @contour-ui/tokens design-system <out-dir>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  aliasPath,
  cssColor,
  cssCubicBezier,
  cssFontFamily,
  cssUnitValue,
  expectRecord,
  getPath,
  groupEntries,
  readJson,
  tokenValue,
} from './dtcg.ts';
import type { JsonRecord } from './dtcg.ts';
import { cssVarName } from './naming.ts';
import { PACKAGE_DIR, PALETTE_FILE, semanticColorFile } from './paths.ts';

const [outDir] = process.argv.slice(2);
if (outDir === undefined) {
  throw new Error('Usage: node scripts/to-design-system.ts <out-dir>');
}

const sourceFile = (file: string): string => path.join(PACKAGE_DIR, 'src', file);
const baseOf = (file: string): JsonRecord =>
  expectRecord(expectRecord(readJson(file), file)['base'], `${file}: base`);

const base: JsonRecord = {
  ...baseOf(PALETTE_FILE),
  ...baseOf(sourceFile('base/dimension.tokens.json')),
  ...baseOf(sourceFile('base/typography.tokens.json')),
  ...baseOf(sourceFile('base/motion.tokens.json')),
};
const semanticDimension = expectRecord(
  readJson(sourceFile('semantic/dimension.tokens.json')),
  'semantic/dimension',
);
const semanticText = expectRecord(
  expectRecord(readJson(sourceFile('semantic/typography.tokens.json')), 'semantic/typography')[
    'text'
  ],
  'semantic/typography: text',
);
const themeColors = {
  dark: expectRecord(readJson(semanticColorFile('dark')), 'color.dark')['color'],
  light: expectRecord(readJson(semanticColorFile('light')), 'color.light')['color'],
};

/** `ct-…` name of the CSS variable an alias points to. */
const refName = (ref: unknown): string => {
  const target = aliasPath(ref);
  if (target === undefined) {
    throw new TypeError(`Expected an alias, got ${JSON.stringify(ref)}.`);
  }
  return cssVarName(target).slice(2);
};

/** Resolve `{base.…}` aliases against the merged base groups; literals pass through. */
const resolveBase = (value: unknown): unknown => {
  const target = aliasPath(value);
  return target === undefined
    ? value
    : tokenValue(getPath(base, target.slice(1), String(value)), String(value));
};

const usage: Readonly<Record<string, string>> = {
  'bg-canvas': 'Plugin window background, the lowest layer.',
  'bg-surface': 'Panels and sections on the canvas.',
  'bg-raised': 'Menus, popovers, tooltips.',
  'bg-inset': 'Recessed wells: knob and slider tracks, meter backgrounds, displays.',
  'bg-hover': 'Hover background for controls and rows.',
  'fg-default': 'Primary text and icons on any bg role.',
  'fg-muted': 'Secondary text: control labels, descriptions. 4.5:1 on surface and raised.',
  'fg-subtle': 'Units, tick labels, metadata. 3:1 minimum, not for body text.',
  'fg-disabled': 'Disabled labels. Exempt from contrast targets.',
  'border-subtle': 'Dividers between sections. Decorative.',
  'border-default': 'Panel and card outlines.',
  'border-strong': 'Control boundaries (inputs, selects). 3:1 on surface.',
  'border-focus': 'Focus ring. 3:1 on surface and inset.',
};

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const statusUsage: Readonly<Record<string, (role: string) => string>> = {
  fill: (role) =>
    `Solid ${role} background: primary buttons, active toggles, value arcs on inset tracks.`,
  'fill-hover': (role) => `Hover state of ${role}-fill.`,
  'on-fill': (role) => `Text and icons on ${role}-fill.`,
  fg: (role) => `${capitalize(role)} text and icons on surface or on ${role}-bg.`,
  bg: (role) => `Quiet ${role} tint behind ${role}-fg: banners, selected rows.`,
  border: (role) => `Outline paired with ${role}-bg.`,
};

interface ListedToken {
  readonly name: string;
  readonly value: unknown;
  readonly usage: string | undefined;
}

// Colors: base palette as plain values, roles as per-theme aliases (dark first, the default).
const colorTokens: ListedToken[] = [];
for (const [hue, stops] of groupEntries(getPath(base, ['color'], 'base.color'), 'base.color')) {
  for (const [stop, token] of groupEntries(stops, `base.color.${hue}`)) {
    colorTokens.push({
      name: cssVarName(['base', 'color', hue, stop]).slice(2),
      value: cssColor(tokenValue(token, `base.color.${hue}.${stop}`), `base.color.${hue}.${stop}`),
      usage: `Base palette, ${hue} ${stop}. Not for direct use in components; reference through a semantic role.`,
    });
  }
}
for (const [group, roles] of groupEntries(themeColors.dark, 'color.dark')) {
  for (const [role] of groupEntries(roles, `color.dark.${group}`)) {
    const key = `${group}-${role}`;
    const roleValue = (theme: 'dark' | 'light'): unknown =>
      tokenValue(getPath(themeColors[theme], [group, role], key), key);
    colorTokens.push({
      name: `ct-color-${key}`,
      value: { dark: `{${refName(roleValue('dark'))}}`, light: `{${refName(roleValue('light'))}}` },
      usage: usage[key] ?? statusUsage[role]?.(group) ?? '',
    });
  }
}

function list(
  group: unknown,
  prefix: string,
  format: (value: unknown, what: string) => string,
  note: (key: string, token: JsonRecord) => string | undefined,
): ListedToken[] {
  return groupEntries(group, prefix).map(([key, token]) => {
    const record = expectRecord(token, `${prefix}-${key}`);
    return {
      name: `${prefix}-${key}`,
      value: format(record['$value'], `${prefix}-${key}`),
      usage: note(key, record),
    };
  });
}

const resolvedDimension = (value: unknown, what: string): string =>
  cssUnitValue(resolveBase(value), what);
const semanticGroup = (key: string): unknown => semanticDimension[key];
const lookupNote =
  (notes: Readonly<Record<string, string>>) =>
  (key: string): string | undefined =>
    notes[key];

function textStyle(name: string, sample: string): JsonRecord {
  const token = expectRecord(semanticText[name], `text.${name}`);
  const value = expectRecord(token['$value'], `text.${name}`);
  const description = token['$description'];
  const fallback: Readonly<Record<string, string>> = {
    heading: 'Panel and section titles.',
    body: 'Descriptions, menu items, longer text.',
  };
  return {
    name: `ct-text-${name}`,
    fontSize: cssUnitValue(resolveBase(value['fontSize']), `text.${name}.fontSize`),
    lineHeight: resolveBase(value['lineHeight']),
    fontWeight: resolveBase(value['fontWeight']),
    letterSpacing: cssUnitValue(resolveBase(value['letterSpacing']), `text.${name}.letterSpacing`),
    sample,
    usage: typeof description === 'string' ? description : fallback[name],
  };
}

const family = (key: string): string =>
  cssFontFamily(resolveBase(`{base.font-family.${key}}`), `base.font-family.${key}`);

const tokens = {
  name: 'Contour',
  version: 1,
  meta: {
    source:
      'DTCG 2025.10 files in packages/tokens (contour.resolver.json). This page mirrors them.',
  },
  color: {
    themes: [
      { id: 'dark', name: 'Dark' },
      { id: 'light', name: 'Light' },
    ],
    tokens: colorTokens,
  },
  type: {
    fonts: [],
    families: { ui: family('ui'), mono: family('mono') },
    groups: [
      {
        name: 'Text',
        family: 'ui',
        styles: ['heading', 'body', 'label', 'caption'].map((style) => textStyle(style, 'Gain')),
      },
      {
        name: 'Numeric',
        family: 'mono',
        styles: [textStyle('value', '-6.0 dB  1.20 kHz  Q 0.71')],
      },
    ],
  },
  spacing: {
    tokens: [
      ...list(base['space'], 'ct-base-space', cssUnitValue, (key) => `Base step, ${key}px.`),
      ...list(semanticGroup('space'), 'ct-space', resolvedDimension, (_key, token) => {
        const description = token['$description'];
        const target = aliasPath(token['$value'])?.join('.') ?? '';
        return `${typeof description === 'string' ? description : ''} Resolves to ${target}.`;
      }),
      ...list(
        semanticGroup('size'),
        'ct-size',
        resolvedDimension,
        (key) =>
          `Height of ${(key.split('-')[1] ?? key).toUpperCase()} controls: buttons, inputs, selects.`,
      ),
    ],
  },
  radius: {
    tokens: [
      ...list(base['radius'], 'ct-base-radius', cssUnitValue, (key) =>
        key === 'full' ? 'Pill and circle shapes.' : `Base radius, ${key}px.`,
      ),
      ...list(
        semanticGroup('radius'),
        'ct-radius',
        resolvedDimension,
        lookupNote({
          control: 'Buttons, inputs, selects, toggles.',
          panel: 'Panels, menus, popovers.',
          round: 'Pills, round toggles, knob caps.',
        }),
      ),
    ],
  },
  borderWidth: {
    tokens: [
      ...list(
        base['border-width'],
        'ct-base-border-width',
        cssUnitValue,
        (key) => `Base border width, ${key}px.`,
      ),
      ...list(semanticGroup('border-width'), 'ct-border-width', resolvedDimension, (key) =>
        key === 'focus' ? 'Focus ring width.' : 'All borders and dividers.',
      ),
    ],
  },
  duration: {
    tokens: list(
      base['duration'],
      'ct-base-duration',
      cssUnitValue,
      lookupNote({
        0: 'No transition.',
        80: 'Hover, press, toggle feedback (motion.feedback).',
        150: 'Menus and popovers appearing (motion.enter).',
        250: 'Larger panel transitions.',
      }),
    ),
  },
  easing: {
    tokens: list(
      base['easing'],
      'ct-base-easing',
      cssCubicBezier,
      lookupNote({
        standard: 'Default curve for enter transitions.',
        out: 'Feedback: fast start, soft stop.',
        in: 'Exits.',
      }),
    ),
  },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'tokens.json'), `${JSON.stringify(tokens, null, 2)}\n`);
console.log(
  `colors ${colorTokens.length}, spacing ${tokens.spacing.tokens.length}, radius ${tokens.radius.tokens.length}`,
);
