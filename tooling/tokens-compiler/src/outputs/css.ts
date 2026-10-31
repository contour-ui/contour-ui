/**
 * `tokens.css`: every token as custom properties. The default theme is the base layer, on `:root`
 * and on its own attribute value; every other theme redeclares only what differs.
 */
import { themeDeclarations } from '../platforms/web.ts';
import type { Declaration, WebPlatform } from '../platforms/web.ts';
import { generatedBy } from './output.ts';
import type { TierOption, TokenOutput } from './output.ts';

function cssBlock(selector: string, theme: string, declarations: readonly Declaration[]): string {
  const colorScheme = theme === 'dark' || theme === 'light' ? [`color-scheme: ${theme};`] : [];
  const lines = [...colorScheme, ...declarations.map(({ name, value }) => `${name}: ${value};`)];
  return `${selector} {\n${lines.map((line) => `  ${line}`).join('\n')}\n}\n`;
}

export function css(
  web: WebPlatform,
  { file, tiers }: { readonly file: string } & TierOption,
): TokenOutput {
  const source = `css(${file})`;
  return {
    name: source,
    entries: [],
    build(model, report) {
      const tokens = model.tokens.filter(
        (token) => tiers === undefined || tiers.includes(token.tier),
      );
      const themes = themeDeclarations(model, web, tokens, source, report);
      const [defaults, ...others] = themes ?? [];
      if (defaults === undefined) {
        return [];
      }
      const attribute = web.themeAttribute;
      const blocks = [
        cssBlock(
          `:root,\n[${attribute}="${defaults.theme}"]`,
          defaults.theme,
          [...defaults.declarations.values()].flat(),
        ),
        ...others.map((theme) => {
          // Redeclare every token whose resolved value differs from the default theme, including
          // aliases of theme tokens: a custom property inherits its computed value, so an alias
          // declared only on :root would keep the default value.
          const changed = [...theme.declarations].filter(
            ([id]) => theme.resolved.get(id) !== defaults.resolved.get(id),
          );
          return cssBlock(
            `[${attribute}="${theme.theme}"]`,
            theme.theme,
            changed.flatMap(([, declarations]) => declarations),
          );
        }),
      ];
      return [
        {
          kind: 'asset',
          fileName: file,
          source: `/* ${generatedBy(model)} */\n\n${blocks.join('\n')}`,
        },
      ];
    },
  };
}
