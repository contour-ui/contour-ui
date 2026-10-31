/**
 * `docs.json`: every custom property of the CSS, one per line, with its token, type, part,
 * description and, in each theme, its value fully resolved and the property it is an alias of.
 * For token references such as the Tokens page of the docs site.
 */
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

function themeValue(name: string, values: ReadonlyMap<string, string>): ThemeValue {
  const value = values.get(name);
  if (value === undefined) {
    throw new Error(`${name} is missing in a theme.`);
  }
  return { value: resolveVars(value, values), alias: ALIAS.exec(value)?.[1] ?? null };
}

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
              declared.map(({ theme, values }) => [theme, themeValue(name, values)]),
            ),
          })),
        );
        const lines = docsOfTokens.map((doc) => `    ${JSON.stringify(doc)}`).join(',\n');
        const json = `{\n  "$description": ${JSON.stringify(generatedBy(model))},\n  "tokens": [\n${lines}\n  ]\n}\n`;
        return [{ kind: 'asset', fileName: file, source: json }];
      } catch (error) {
        report({ source, message: error instanceof Error ? error.message : String(error) });
        return [];
      }
    },
  };
}
