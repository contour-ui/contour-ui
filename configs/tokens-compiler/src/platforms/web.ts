/**
 * The web platform: how a token becomes CSS custom properties. A literal is formatted for CSS
 * (`oklch()`, `6px`, `cubic-bezier()`), an alias stays a `var(--…)` reference, so a role keeps its
 * link to the palette in the browser. A composite becomes several properties: a text style is a
 * `font` shorthand plus one property per sub-value.
 */
import {
  aliasPath,
  expectRecord,
  parseColor,
  parseNumberArray,
  parseStringArray,
  parseUnitValue,
  round3,
} from '../model/dtcg.ts';
import type { ColorComponent } from '../model/dtcg.ts';
import { themesDefaultFirst, unknownType, valueIn } from '../model/model.ts';
import type { ModelToken, TokenModel, TokenType } from '../model/model.ts';
import { attempt } from '../model/problem.ts';
import type { Report } from '../model/problem.ts';

export interface WebPlatformOptions {
  /** The prefix of every custom property: `ct` gives `--ct-color-bg-surface`. */
  readonly prefix: string;
  /** The attribute that switches the theme of a subtree, such as `data-theme`. */
  readonly themeAttribute: string;
}

export interface Declaration {
  /** `--ct-text-label-font-size` */
  readonly name: string;
  /** The value in the theme: literals formatted for CSS, aliases `var(--…)` references. */
  readonly value: string;
  /** The sub-value of a composite token (`['fontSize']`, `['font']`), empty for a whole token. */
  readonly part: readonly string[];
}

export interface WebPlatform {
  readonly name: 'web';
  readonly prefix: string;
  readonly themeAttribute: string;
  /** `--ct-color-bg-surface` for `['color', 'bg', 'surface']`. */
  variable(path: readonly string[]): string;
  /** The custom properties a token declares in a theme; throws on a value it cannot write. */
  declarations(token: ModelToken, theme: string): readonly Declaration[];
  /** The resolved value as CSS, to tell the themes a token differs in. */
  resolved(token: ModelToken, theme: string): string;
}

type Formatter = (value: unknown, what: string) => string;

const formatComponent = (component: ColorComponent): string =>
  component === 'none' ? 'none' : String(round3(component));

/** DTCG oklch color -> `oklch(L C H)` / `oklch(L C H / a)`. */
export function cssColor(value: unknown, what: string): string {
  const color = parseColor(value, what);
  if (color.colorSpace !== 'oklch') {
    throw new TypeError(`${what}: only oklch colors are supported (got ${color.colorSpace}).`);
  }
  const channels = color.components.map((component) => formatComponent(component)).join(' ');
  return color.alpha === 1 ? `oklch(${channels})` : `oklch(${channels} / ${round3(color.alpha)})`;
}

/** DTCG dimension / duration object -> `6px`, `80ms`. */
export function cssUnitValue(value: unknown, what: string): string {
  const { value: amount, unit } = parseUnitValue(value, what);
  return `${amount}${unit}`;
}

export function cssCubicBezier(value: unknown, what: string): string {
  return `cubic-bezier(${parseNumberArray(value, what).join(', ')})`;
}

/** Font stack; names containing spaces are quoted. */
export function cssFontFamily(value: unknown, what: string): string {
  return parseStringArray(value, what)
    .map((family) => (family.includes(' ') ? `"${family}"` : family))
    .join(', ');
}

export function cssPlain(value: unknown, what: string): string {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new TypeError(`${what}: expected a number or a string.`);
  }
  return String(value);
}

/** Typography sub-values become separate custom properties, in this order. */
const TYPOGRAPHY: ReadonlyArray<readonly [string, Formatter]> = [
  ['fontFamily', cssFontFamily],
  ['fontSize', cssUnitValue],
  ['fontWeight', cssPlain],
  ['lineHeight', cssPlain],
  ['letterSpacing', cssUnitValue],
];

/** Transition sub-values in CSS `transition` shorthand order: duration, timing function, delay. */
const TRANSITION: ReadonlyArray<readonly [string, Formatter]> = [
  ['duration', cssUnitValue],
  ['timingFunction', cssCubicBezier],
  ['delay', cssUnitValue],
];

/** Shadow layer sub-values in CSS `box-shadow` order, after the optional `inset`. */
const SHADOW: ReadonlyArray<readonly [string, Formatter]> = [
  ['offsetX', cssUnitValue],
  ['offsetY', cssUnitValue],
  ['blur', cssUnitValue],
  ['spread', cssUnitValue],
  ['color', cssColor],
];

type CompositeType = 'typography' | 'transition' | 'shadow';

/** Formatters of the primitive types. */
const PRIMITIVES: Readonly<Record<Exclude<TokenType, CompositeType>, Formatter>> = {
  color: cssColor,
  dimension: cssUnitValue,
  duration: cssUnitValue,
  cubicBezier: cssCubicBezier,
  fontFamily: cssFontFamily,
  fontWeight: cssPlain,
  number: cssPlain,
};

const kebab = (segment: string): string =>
  segment.replaceAll(/[A-Z]/gu, (char) => `-${char.toLowerCase()}`);

export function webPlatform({ prefix, themeAttribute }: WebPlatformOptions): WebPlatform {
  const variable = (path: readonly string[]): string =>
    `--${[prefix, ...path.map((segment) => kebab(segment))].join('-')}`;
  const reference = (path: readonly string[]): string => `var(${variable(path)})`;

  /** A value: an alias as a `var(--…)` reference, a literal with `format`. */
  const printValue = (value: unknown, format: Formatter, where: string): string => {
    const alias = aliasPath(value);
    return alias === undefined ? format(value, where) : reference(alias);
  };

  /**
   * `--ct-text-<style>`: a CSS `font` shorthand built from the style's own custom properties.
   * `letter-spacing` is not part of the `font` shorthand and stays a separate property.
   */
  const fontShorthand = (
    token: ModelToken,
    alias: readonly string[] | undefined,
    properties: readonly Declaration[],
  ): Declaration[] => {
    const name = variable(token.path);
    if (alias !== undefined) {
      return [{ name, value: reference(alias), part: ['font'] }];
    }
    const ref = (key: string): string | undefined =>
      properties.some((property) => property.part[0] === key)
        ? reference([...token.path, key])
        : undefined;
    const [weight, size, lineHeight, family] = [
      ref('fontWeight'),
      ref('fontSize'),
      ref('lineHeight'),
      ref('fontFamily'),
    ];
    if (size === undefined || family === undefined) {
      return [];
    }
    const sizeAndLineHeight = lineHeight === undefined ? size : `${size}/${lineHeight}`;
    const value = [weight, sizeAndLineHeight, family]
      .filter((part) => part !== undefined)
      .join(' ');
    return [{ name, value, part: ['font'] }];
  };

  /** One `box-shadow` layer: a shadow object, or an alias of a whole shadow token. */
  const shadowLayer = (layer: unknown, where: string): string => {
    const alias = aliasPath(layer);
    if (alias !== undefined) {
      return reference(alias);
    }
    const parts = expectRecord(layer, where);
    const inset = parts['inset'] ?? false;
    if (typeof inset !== 'boolean') {
      throw new TypeError(`${where}.inset: expected a boolean.`);
    }
    const values = SHADOW.map(([key, format]) => printValue(parts[key], format, `${where}.${key}`));
    return (inset ? ['inset', ...values] : values).join(' ');
  };

  const declarations = (token: ModelToken, theme: string): Declaration[] => {
    const { value, authored } = valueIn(token, theme);
    const alias = aliasPath(authored);
    const name = variable(token.path);
    switch (token.type) {
      case 'typography': {
        const parts = alias === undefined ? expectRecord(authored, token.id) : undefined;
        const properties = TYPOGRAPHY.flatMap(([key, format]): Declaration[] => {
          const property = variable([...token.path, key]);
          if (alias !== undefined) {
            return [{ name: property, value: reference([...alias, key]), part: [key] }];
          }
          const part = parts?.[key];
          return part === undefined
            ? []
            : [
                {
                  name: property,
                  value: printValue(part, format, `${token.id}.${key}`),
                  part: [key],
                },
              ];
        });
        return [...fontShorthand(token, alias, properties), ...properties];
      }
      case 'transition': {
        if (alias !== undefined) {
          return [{ name, value: reference(alias), part: [] }];
        }
        const parts = expectRecord(authored, token.id);
        const printed = TRANSITION.map(([key, format]) =>
          printValue(parts[key], format, `${token.id}.${key}`),
        ).join(' ');
        return [{ name, value: printed, part: [] }];
      }
      case 'shadow': {
        // One layer or a list of layers; `box-shadow` takes a comma-separated list.
        const layers: unknown[] = Array.isArray(authored) ? authored : [authored];
        const printed =
          alias === undefined
            ? layers.map((layer, index) => shadowLayer(layer, `${token.id}[${index}]`)).join(', ')
            : reference(alias);
        return [{ name, value: printed, part: [] }];
      }
      case 'color':
      case 'cubicBezier':
      case 'dimension':
      case 'duration':
      case 'fontFamily':
      case 'fontWeight':
      case 'number': {
        const format = PRIMITIVES[token.type];
        return [
          {
            name,
            value: alias === undefined ? format(value, token.id) : reference(alias),
            part: [],
          },
        ];
      }
      default: {
        return unknownType(token.type, token.id);
      }
    }
  };

  return { name: 'web', prefix, themeAttribute, variable, declarations, resolved: resolvedValue };
}

/** A primitive as CSS, a composite as JSON: what tells the themes a token differs in. */
function resolvedValue(token: ModelToken, theme: string): string {
  const { value } = valueIn(token, theme);
  switch (token.type) {
    case 'typography':
    case 'transition':
    case 'shadow': {
      return JSON.stringify(value);
    }
    case 'color':
    case 'cubicBezier':
    case 'dimension':
    case 'duration':
    case 'fontFamily':
    case 'fontWeight':
    case 'number': {
      return PRIMITIVES[token.type](value, token.id);
    }
    default: {
      return unknownType(token.type, token.id);
    }
  }
}

export interface ThemeDeclarations {
  readonly theme: string;
  /** By token id, in the order of the model. */
  readonly declarations: ReadonlyMap<string, readonly Declaration[]>;
  /** The resolved value of each token as CSS, by token id. */
  readonly resolved: ReadonlyMap<string, string>;
}

/** The declarations of every token in each theme, the default theme first; `undefined` on problems. */
export function themeDeclarations(
  model: TokenModel,
  web: WebPlatform,
  tokens: readonly ModelToken[],
  source: string,
  report: Report,
): ThemeDeclarations[] | undefined {
  let failed = false;
  const themes = themesDefaultFirst(model).map((theme): ThemeDeclarations => {
    const declarations = new Map<string, readonly Declaration[]>();
    const resolved = new Map<string, string>();
    const producers = new Map<string, string>();
    for (const token of tokens) {
      const written = attempt(report, source, token, theme, () => ({
        declarations: web.declarations(token, theme),
        resolved: web.resolved(token, theme),
      }));
      if (written === undefined) {
        failed = true;
        continue;
      }
      for (const { name } of written.declarations) {
        const producer = producers.get(name);
        if (producer !== undefined) {
          report({
            source,
            token: token.id,
            theme,
            message: `${name} is also produced by ${producer}.`,
          });
          failed = true;
        }
        producers.set(name, token.id);
      }
      declarations.set(token.id, written.declarations);
      resolved.set(token.id, written.resolved);
    }
    return { theme, declarations, resolved };
  });
  const [defaults] = themes;
  for (const { theme, declarations } of themes) {
    for (const [id, list] of declarations) {
      const names = list.map(({ name }) => name).join();
      if (
        names !==
        defaults?.declarations
          .get(id)
          ?.map(({ name }) => name)
          .join()
      ) {
        report({
          source,
          token: id,
          theme,
          message: `declares other properties than the ${model.defaultTheme} theme.`,
        });
        failed = true;
      }
    }
  }
  return failed ? undefined : themes;
}
