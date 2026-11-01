/**
 * `docs.json`: every custom property of the CSS, one per line, with its token, type, part,
 * description and, in each theme, its value fully resolved as CSS, the property it is an alias of
 * and the value as DTCG data; then the contrast pairs with their ratio in each theme. For token
 * references such as the Tokens page of the docs site, which read numbers rather than parse CSS.
 */
import { contrastRatio, hexOf } from '../model/color.ts';
import { isRecord, parseColor } from '../model/dtcg.ts';
import { valueIn } from '../model/model.ts';
import type { ModelToken } from '../model/model.ts';
import { themeDeclarations } from '../platforms/web.ts';
import type { WebPlatform } from '../platforms/web.ts';
import { generatedBy } from './output.ts';
import type { TierOption, TokenOutput } from './output.ts';

/** A `var(--…)` reference inside a CSS value; the whole value when it is an alias. */
const VAR_REFERENCE = /var\((--[\w-]+)\)/gu;
const ALIAS = /^var\((--[\w-]+)\)$/u;

/** Substitute `var()` references recursively, the way the browser computes a custom property. */
function resolveVars(value: string, declared: ReadonlyMap<string, string>): string {
  return value.replaceAll(VAR_REFERENCE, (reference: string, name: string) => {
    const target = declared.get(name);
    if (target === undefined) {
      throw new Error(`${reference} does not match any declaration.`);
    }
    return resolveVars(target, declared);
  });
}

interface ThemeValue {
  /** Fully resolved CSS value. */
  readonly value: string;
  /** Custom property this one is an alias of, `null` for literals and shorthands. */
  readonly alias: string | null;
  /** The resolved value as DTCG data; a color with its alpha and its sRGB `hex`. */
  readonly dtcg: unknown;
}

interface TokenDoc {
  /** Custom property, such as `--ct-text-label-font-size`. */
  readonly name: string;
  /** DTCG path of the token it comes from, such as `text.label`. */
  readonly token: string;
  readonly type: string;
  /** Composite sub-value (`font` shorthand, `fontSize`…), `null` for a whole token. */
  readonly part: string | null;
  readonly description: string | null;
  readonly themes: Readonly<Record<string, ThemeValue>>;
}

interface ContrastDoc {
  readonly foreground: string;
  readonly background: string;
  readonly kind: 'text' | 'ui';
  /** The least ratio the build holds the pair to, `null` for a pair WCAG exempts. */
  readonly minimum: number | null;
  /** The WCAG 2 ratio in each theme, cut (never rounded up) to two decimals. */
  readonly ratios: Readonly<Record<string, number>>;
}

/** Every color object in a value with its alpha and its hex, everything else as it is. */
function withHex(value: unknown, what: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item: unknown, index) => withHex(item, `${what}[${index}]`));
  }
  if (!isRecord(value)) {
    return value;
  }
  if ('colorSpace' in value) {
    const { colorSpace, components, alpha } = parseColor(value, what);
    return { colorSpace, components, alpha, hex: hexOf(value, what) };
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, withHex(item, `${what}.${key}`)]),
  );
}

/**
 * The DTCG value behind a custom property: the whole value, or a composite's sub-value. The `font`
 * shorthand of a text style stands for the whole style.
 */
function dtcgOf(token: ModelToken, part: readonly string[], theme: string): unknown {
  const { value } = valueIn(token, theme);
  const [key] = part;
  const own = key === undefined || key === 'font' || !isRecord(value) ? value : value[key];
  return withHex(own, token.id);
}

function themeValue(name: string, values: ReadonlyMap<string, string>, dtcg: unknown): ThemeValue {
  const value = values.get(name);
  if (value === undefined) {
    throw new Error(`${name} is missing in a theme.`);
  }
  return { value: resolveVars(value, values), alias: ALIAS.exec(value)?.[1] ?? null, dtcg };
}

const cut = (ratio: number): number => Math.floor(ratio * 100) / 100;

/** A JSON list with one item per line, as the rest of the file. */
const list = (items: readonly unknown[]): string =>
  items.length === 0
    ? '[]'
    : `[\n${items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]`;

export function docs(
  web: WebPlatform,
  { file, tiers }: { readonly file: string } & TierOption,
): TokenOutput {
  const source = `docs(${file})`;
  return {
    name: source,
    entries: [],
    build(model, report) {
      const tokens = model.tokens.filter(
        (token) => tiers === undefined || tiers.includes(token.tier),
      );
      const themes = themeDeclarations(model, web, tokens, source, report);
      const [defaults] = themes ?? [];
      if (themes === undefined || defaults === undefined) {
        return [];
      }
      const declared = themes.map(({ theme, declarations }) => ({
        theme,
        values: new Map(
          [...declarations.values()]
            .flat()
            .map(({ name, value }): [string, string] => [name, value]),
        ),
      }));
      try {
        const docsOfTokens = tokens.flatMap((token) =>
          (defaults.declarations.get(token.id) ?? []).map(({ name, part }): TokenDoc => ({
            name,
            token: token.id,
            type: token.type,
            part: part.length > 0 ? part.join('.') : null,
            description: token.description ?? null,
            themes: Object.fromEntries(
              declared.map(({ theme, values }) => [
                theme,
                themeValue(name, values, dtcgOf(token, part, theme)),
              ]),
            ),
          })),
        );
        const contrast = model.contrast.map((pair): ContrastDoc => ({
          foreground: pair.foreground,
          background: pair.background,
          kind: pair.kind,
          minimum: pair.minimum ?? null,
          ratios: Object.fromEntries(
            themes.map(({ theme }) => [theme, cut(contrastRatio(model, pair, theme))]),
          ),
        }));
        const json = `{\n  "$description": ${JSON.stringify(generatedBy(model))},\n  "tokens": ${list(docsOfTokens)},\n  "contrast": ${list(contrast)}\n}\n`;
        return [{ kind: 'asset', fileName: file, source: json }];
      } catch (error) {
        report({ source, message: error instanceof Error ? error.message : String(error) });
        return [];
      }
    },
  };
}
