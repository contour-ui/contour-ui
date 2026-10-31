/**
 * Sources to model. One Style Dictionary run per theme context of the resolver merges the files
 * in resolution order and resolves the aliases; the runs become one model, after the checks that
 * hold for every model: aliases point at tokens, every theme has the same tokens with the same
 * types and descriptions, names are kebab-case and types known.
 */
import StyleDictionary from 'style-dictionary';
import type { TransformedToken } from 'style-dictionary/types';

import { aliasesIn, isRecord } from '../model/dtcg.ts';
import { TOKEN_TYPES, createModel } from '../model/model.ts';
import type { ModelToken, ThemeValue, Tier, TokenModel, TokenType } from '../model/model.ts';
import { attemptBuild, messageOf } from '../model/problem.ts';
import type { Report } from '../model/problem.ts';
import { loadResolver } from './resolver.ts';

/** What the model's own checks report as. */
const SOURCE = 'model';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export interface SourceReader {
  /** Read a JSON file; the build watches every file it reads. */
  readJson(file: string): unknown;
}

const isTokenType = (value: unknown): value is TokenType =>
  TOKEN_TYPES.some((type) => type === value);

/** Base tokens are the `base` group; the others are semantic until a component tier exists. */
const tierOf = (path: readonly string[]): Tier => (path[0] === 'base' ? 'base' : 'semantic');

const idOf = (token: TransformedToken): string => token.path.join('.');

/** The tokens of a DTCG document, the objects with a `$value`, by id. */
function collectTokens(node: unknown, path: readonly string[], into: Map<string, unknown>): void {
  if (!isRecord(node)) {
    return;
  }
  if ('$value' in node) {
    into.set(path.join('.'), node['$value']);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith('$')) {
      collectTokens(child, [...path, key], into);
    }
  }
}

/**
 * Report every alias that points at no token. Style Dictionary fails on them too, but its error
 * names neither the token nor the alias.
 */
function checkAliases(
  files: readonly string[],
  theme: string,
  reader: SourceReader,
  report: Report,
): boolean {
  const tokens = new Map<string, unknown>();
  for (const file of files) {
    collectTokens(reader.readJson(file), [], tokens);
  }
  let resolved = true;
  for (const [id, value] of tokens) {
    for (const alias of aliasesIn(value)) {
      if (!tokens.has(alias.join('.'))) {
        report({
          source: SOURCE,
          token: id,
          theme,
          message: `{${alias.join('.')}} does not resolve.`,
        });
        resolved = false;
      }
    }
  }
  return resolved;
}

/** Every token of one theme context, aliases resolved and values left as DTCG data. */
async function themeTokens(
  include: readonly string[],
  source: readonly string[],
): Promise<TransformedToken[]> {
  const sd = new StyleDictionary({
    include: [...include],
    source: [...source],
    // Collisions and other warnings fail the build; success logs stay quiet.
    log: { warnings: 'error', verbosity: 'silent' },
    platforms: { model: { transforms: [] } },
  });
  const { allTokens } = await sd.getPlatformTokens('model');
  return allTokens;
}

/** The model of a resolver's tokens, or `undefined` after reporting why there is none. */
export async function resolveModel(
  resolverFile: string,
  reader: SourceReader,
  report: Report,
): Promise<TokenModel | undefined> {
  const resolver = attemptBuild(report, SOURCE, () =>
    loadResolver(resolverFile, (file) => reader.readJson(file)),
  );
  if (resolver === undefined) {
    return undefined;
  }
  const themes = resolver.contexts;
  const aliasesResolve = themes
    .map((theme) => {
      const { include, source } = resolver.files(theme);
      return checkAliases([...include, ...source], theme, reader, report);
    })
    .every(Boolean);
  if (!aliasesResolve) {
    return undefined;
  }

  let runs: Array<readonly [string, TransformedToken[]]>;
  try {
    runs = await Promise.all(
      themes.map(async (theme) => {
        const { include, source } = resolver.files(theme);
        return [theme, await themeTokens(include, source)] as const;
      }),
    );
  } catch (error) {
    report({ source: 'style-dictionary', message: messageOf(error) });
    return undefined;
  }

  const byTheme = new Map(
    runs.map(([theme, tokens]) => [theme, new Map(tokens.map((token) => [idOf(token), token]))]),
  );
  const defaults = byTheme.get(resolver.defaultContext) ?? new Map<string, TransformedToken>();
  for (const [theme, tokens] of byTheme) {
    for (const id of tokens.keys()) {
      if (!defaults.has(id)) {
        report({
          source: SOURCE,
          token: id,
          theme,
          message: `is not in the ${resolver.defaultContext} theme.`,
        });
      }
    }
    for (const id of defaults.keys()) {
      if (!tokens.has(id)) {
        report({ source: SOURCE, token: id, theme, message: 'is missing in this theme.' });
      }
    }
  }

  const tokens: ModelToken[] = [];
  for (const [id, token] of defaults) {
    for (const segment of token.path) {
      if (!KEBAB.test(segment)) {
        report({ source: SOURCE, token: id, message: `"${segment}" is not a kebab-case name.` });
      }
    }
    const type: unknown = token.$type;
    if (!isTokenType(type)) {
      report({
        source: SOURCE,
        token: id,
        message: `$type ${JSON.stringify(type)} is not supported.`,
      });
      continue;
    }
    const description: unknown = token.$description;
    const values: Record<string, ThemeValue> = {};
    for (const theme of themes) {
      const themed = byTheme.get(theme)?.get(id);
      if (themed === undefined) {
        continue;
      }
      if (themed.$type !== type) {
        report({
          source: SOURCE,
          token: id,
          theme,
          message: `$type differs from the ${resolver.defaultContext} theme.`,
        });
      }
      if (themed.$description !== description) {
        report({
          source: SOURCE,
          token: id,
          theme,
          message: `$description differs from the ${resolver.defaultContext} theme.`,
        });
      }
      const value: unknown = themed.$value;
      const authored: unknown = themed.original.$value;
      values[theme] = { value, authored };
    }
    tokens.push({
      id,
      path: token.path,
      tier: tierOf(token.path),
      type,
      description: typeof description === 'string' ? description : undefined,
      themes: values,
    });
  }

  return createModel({
    resolver: resolverFile,
    themes,
    defaultTheme: resolver.defaultContext,
    tokens,
  });
}
