/**
 * The data of the Tokens page: `@contour-ui/tokens/docs.json`, which the token build writes with
 * `tokens.css`, so the page lists what the stylesheet declares, with each theme's value.
 */
import { defaultTheme, themes } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';
import docs from '@contour-ui/tokens/docs.json' with { type: 'json' };

/** The value of a custom property in one theme. */
export interface ThemeValue {
  /** The resolved CSS value. */
  readonly value: string;
  /** The custom property it refers to, `null` for literals and shorthands. */
  readonly alias: string | null;
}

/** One custom property of `tokens.css`, as `docs.json` describes it. */
export interface TokenDoc {
  /** The custom property, such as `--ct-color-bg-surface`. */
  readonly name: string;
  /** The DTCG path of its token, such as `color.bg.surface` or `text.label`. */
  readonly token: string;
  readonly type: string;
  /** The part of a composite token (`font`, `fontSize`…), `null` for a whole token. */
  readonly part: string | null;
  readonly description: string | null;
  readonly themes: Readonly<Record<Theme, ThemeValue>>;
}

const TOKENS: readonly TokenDoc[] = docs.tokens;

/** The whole tokens under a DTCG path prefix, such as `color.` or `size.`, in the order of the CSS. */
export function tokensIn(prefix: string): TokenDoc[] {
  return TOKENS.filter((doc) => doc.part === null && doc.token.startsWith(prefix));
}

/** The whole token at a DTCG path, such as `color.bg.surface`. */
export function tokenAt(path: string): TokenDoc | undefined {
  return TOKENS.find((doc) => doc.part === null && doc.token === path);
}

/** The custom properties of a composite token's parts, such as those of `text.label`. */
export function partsOf(token: string): TokenDoc[] {
  return TOKENS.filter((doc) => doc.part !== null && doc.token === token);
}

/** One part of every composite token under a prefix, such as the `font` of each `text.` style. */
export function partsIn(prefix: string, part: string): TokenDoc[] {
  return TOKENS.filter((doc) => doc.part === part && doc.token.startsWith(prefix));
}

/** Items grouped by a key, in the order of their first item. */
export function groupBy<Item>(
  items: readonly Item[],
  keyOf: (item: Item) => string,
): Map<string, Item[]> {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [item]);
    } else {
      group.push(item);
    }
  }
  return groups;
}

/** Whether a token has the same value and alias in every theme. */
export function sameInEveryTheme(doc: TokenDoc): boolean {
  const { value, alias } = doc.themes[defaultTheme];
  return themes.every(
    (theme) => doc.themes[theme].value === value && doc.themes[theme].alias === alias,
  );
}

/** `dark` → `Dark`. */
export function capitalize(word: string): string {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}
