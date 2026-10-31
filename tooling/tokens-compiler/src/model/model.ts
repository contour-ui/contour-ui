/**
 * The token model: every token with its type, tier, description and value in each theme. It is
 * the contract between the sources (`resolve/`) and what reads them (`platforms/`, `outputs/`,
 * `checks/`): nothing below it reads the sources, nothing above it knows Style Dictionary.
 */

/** The DTCG 2025.10 types the compiler knows. */
export const TOKEN_TYPES = [
  'color',
  'dimension',
  'duration',
  'cubicBezier',
  'fontFamily',
  'fontWeight',
  'number',
  'typography',
  'transition',
  'shadow',
] as const;

export type TokenType = (typeof TOKEN_TYPES)[number];

/**
 * The `default` of a switch that lists every token type: TypeScript proves it unreachable, and a new
 * type in `TOKEN_TYPES` becomes a compile error at each such switch.
 */
export function unknownType(type: never, id: string): never {
  throw new Error(`${id}: $type ${JSON.stringify(type)} is not supported.`);
}

/** Base tokens are raw values; semantic and component tokens are the roles components use. */
export type Tier = 'base' | 'semantic' | 'component';

export interface ThemeValue {
  /** The value with every alias resolved, as DTCG data. */
  readonly value: unknown;
  /** The value as written: an alias is a `{path}` string, whole or inside a composite. */
  readonly authored: unknown;
}

export interface ModelToken {
  /** `color.bg.surface` */
  readonly id: string;
  readonly path: readonly string[];
  readonly tier: Tier;
  readonly type: TokenType;
  readonly description: string | undefined;
  /** The value in each theme. */
  readonly themes: Readonly<Record<string, ThemeValue>>;
}

export interface TokenModel {
  /** The DTCG resolver file the model comes from. */
  readonly resolver: string;
  /** The theme contexts, in the order of the resolver. */
  readonly themes: readonly string[];
  readonly defaultTheme: string;
  /** In the order of the sources. */
  readonly tokens: readonly ModelToken[];
  token(id: string): ModelToken | undefined;
}

/** The value of a token in a theme; every token of a model has one in each of its themes. */
export function valueIn(token: ModelToken, theme: string): ThemeValue {
  const value = token.themes[theme];
  if (value === undefined) {
    throw new Error(`${token.id} has no value in the ${theme} theme.`);
  }
  return value;
}

/** The default theme first, then the others in resolver order: the CSS cascade's order. */
export const themesDefaultFirst = (model: TokenModel): readonly string[] => [
  model.defaultTheme,
  ...model.themes.filter((theme) => theme !== model.defaultTheme),
];

export function createModel(fields: Omit<TokenModel, 'token'>): TokenModel {
  const byId = new Map(fields.tokens.map((token) => [token.id, token]));
  return { ...fields, token: (id) => byId.get(id) };
}
