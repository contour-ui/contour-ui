# @contour-ui/tokens-compiler

The compiler of `@contour-ui/tokens`: DTCG 2025.10 sources into everything the package ships,
with the rules of the design checked on every build. Private tooling, never published; packages
list it in `devDependencies` only.

```ts
// packages/tokens/vite.config.ts
const web = webPlatform({ prefix: 'ct', themeAttribute: 'data-theme' });
const soundor = soundorPlatform({ easing: { 'base.easing.out': 'ease-out' } });

export default defineConfig({
  pack: libraryPack({
    plugins: [
      designTokens({
        resolver: './contour.resolver.json',
        outputs: [
          css(web, { file: 'tokens.css' }),
          vars(web, { entry: 'index' }),
          docs(web, { file: 'docs.json' }),
          values(soundor, { entry: 'soundor', name: 'soundorTokens' }),
        ],
        checks: [contrast('./contrast.json'), paletteSteps('base.color'), gamut('srgb')],
      }),
    ],
  }),
});
```

## Layers

```
src/resolve/     the sources: a DTCG resolver and its files, one Style Dictionary run per theme
src/model/       the model: every token with its tier, type, description and value per theme
src/platforms/   how one platform writes a token: web (CSS custom properties), soundor (values)
src/outputs/     the files of the package: css, vars, docs, values
src/checks/      rules of the design over the model: contrast, paletteSteps, gamut, described
src/build.ts     buildTokens: one build, every problem collected
src/plugin.ts    designTokens: buildTokens inside vp pack
```

The model is the contract: only `resolve/` reads the sources (Style Dictionary stays there),
platforms and outputs read the model, checks read the model alone. Lint holds these imports
(`INTERNAL_RULES` in `scripts/layers.ts`).

- **Platforms.** `webPlatform` names the custom properties and writes values as CSS: literals as
  `oklch()`, `6px`, `cubic-bezier()`; aliases as `var(--…)`, so a role keeps its link to the
  palette; a text style as a `font` shorthand and one property per sub-value. `soundorPlatform`
  writes the values Soundor styles take: hex colors, numbers in px and ms, a named easing, a text
  style as the style of a `Text`; it leaves shadows out, and a value it cannot express (outside
  sRGB, another unit, a curve without a named easing) is a problem of its token.
- **Outputs.** `css` writes `tokens.css` (the default theme on `:root`, other themes redeclare
  what differs); `vars` the entry of typed `var(--…)` references, the themes and their attribute;
  `docs` `docs.json` (every custom property with its value and alias per theme); `values` the
  entry of a platform's values per theme. `css` and `docs` take every tier, `vars` and `values`
  the semantic and component tokens (`tiers` changes it). Outputs import nothing from each other.
- **Checks.** Built in: aliases point at tokens (the problem names the token and the theme), every
  theme has the same tokens with the same types and descriptions, names are kebab-case, no two
  outputs write one file. Given: `contrast(file)` (WCAG 2 pairs from a JSON file, in every theme;
  `group.*` stands for every color of a group; a translucent foreground is composited over its
  background), `paletteSteps(group)` (a stop as light in every hue, within `tolerance`),
  `gamut('srgb')` (every color, shadow colors included), `described(tiers)`.

A build collects every problem and fails with the list, each with its token and theme. In
`vp pack`, entries are modules the plugin serves (`\0design-tokens:<entry>.ts`): tsdown bundles
them and writes their declarations with Oxc from the code (the package type-checks with
`isolatedDeclarations`). Assets are emitted into the bundle. Every file the build read is watched,
so `vp pack --watch` rebuilds on a token edit.

`buildTokens(options, cwd)` is the same build without tsdown, for tests and scripts. Tests run on a
small fixture written to a temporary directory (`src/test-fixtures/`).
