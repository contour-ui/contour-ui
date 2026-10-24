# @contour-ui/tokens

**Layer 0 — foundation.** Design tokens in [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/)
format, built with [Style Dictionary](https://styledictionary.com) into CSS custom
properties and typed TS references.

- **May depend on (internal):** nothing.
- **Storybook:** token reference (port 6101) — tables of every custom property with its value and
  alias per theme (color roles, syntax colors, palette, text styles, space, size, radius, border
  width, shadow, layer, motion), built from `src/generated/docs.json`.

## Usage

```ts
import '@contour-ui/tokens/tokens.css'; // once, before kit/audio styles
import '@contour-ui/tokens/fonts.css'; // IBM Plex Sans + JetBrains Mono, 400/500/600
import { vars } from '@contour-ui/tokens';

vars.color.bg.surface; // 'var(--ct-color-bg-surface)'
```

```css
.panel {
  padding: var(--ct-space-panel-inset);
  background: var(--ct-color-bg-surface);
  color: var(--ct-color-fg-default);
  font: var(--ct-text-body); /* font shorthand; letter-spacing is separate */
  letter-spacing: var(--ct-text-body-letter-spacing);
}
```

- **Themes:** dark is the default (`:root`, `[data-theme="dark"]`); `[data-theme="light"]` on
  any element switches its subtree. `themes`, `defaultTheme` and `themeAttribute` are exported.
- **Base vs semantic:** `--ct-base-*` (raw palette and scales) is emitted because semantic
  roles reference it, but it is internal: components and kits use semantic roles only, and
  `vars` exposes only those.
- **Fonts:** `fonts.css` declares the faces for `--ct-base-font-family-*` and every
  `--ct-base-font-weight-*` (Fontsource packages, SIL OFL 1.1; scripts load via `unicode-range`).
  A story test checks that every family × weight from the tokens actually loads.
- **Typography:** each text style is `--ct-text-<style>` (`font` shorthand) plus
  `--ct-text-<style>-font-family | -font-size | -font-weight | -line-height | -letter-spacing`.
  The dense plugin styles (`heading`, `body`, `label`, `value`, `caption`) have long-form
  companions for docs pages: `display`, `title`, `subtitle` (h1–h3), `prose` and `code`.
- **Code highlighting:** `--ct-color-syntax-<name>` uses the names of Shiki's `css-variables`
  theme (`--shiki-token-<name>`); every one is at least 4.5:1 on `bg-inset`, the code block
  background.
- **Shadows, layers:** `--ct-shadow-<name>` is a `box-shadow` list (DTCG `shadow`, stronger in the
  dark theme); `--ct-layer-<name>` is a `z-index`.

## Sources

```
contour.resolver.json          DTCG resolver: sets (base, semantic) + theme modifier (dark default)
src/base/*.tokens.json         raw values — color.tokens.json is generated
src/semantic/*.tokens.json     roles — color.{dark,light}.tokens.json are generated;
                               color and shadow files per theme, the rest theme-independent
src/generated/                 Style Dictionary output (committed): tokens.css, vars.ts, docs.json
src/stories/                   Storybook token tables (read docs.json)
scripts/                       build and generators
```

| Command (`vp run --filter @contour-ui/tokens …`) | What it does                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `tokens`                                         | Style Dictionary build → `src/generated/tokens.css`, `vars.ts`, `docs.json`                            |
| `dev`                                            | the same, re-run on every source change                                                                |
| `generate`                                       | regenerate the palette and color roles from `scripts/palette.ts` / `semantic-colors.ts`, then `tokens` |
| `design-system <out-dir>`                        | export `tokens.json` for the Design System page                                                        |

Style Dictionary does not read DTCG resolvers yet, so `scripts/resolver.ts` expands
`contour.resolver.json` into one Style Dictionary run per theme: sets become `include`
files, the theme context becomes `source` files. Style Dictionary merges, resolves and
validates aliases and transforms primitive values; `scripts/build-tokens.ts` prints the
CSS (aliases stay `var()` references), `vars.ts`, and `docs.json`: one line per custom property
with its resolved value and alias in each theme, for docs (not part of the published package).

Palette colors are gamut-mapped into sRGB and written with the mapped color's own oklch
coordinates, so the CSS value and the `hex` fallback are the same color. DTCG aliases cannot
change alpha, so a translucent role (`overlay.scrim`) is a copy of its palette color with an
alpha, regenerated with the palette.

Generated files are committed so apps, Storybook and tests use tokens without a build
step. `vp test` checks that they match their sources (`src/generated.test.ts`), that
the color roles meet their WCAG contrast targets in both themes (`src/contrast.test.ts`),
and that every token can be expressed in Soundor (`src/soundor.test.ts`): colors inside
sRGB, lengths in px, a named easing for every curve, no `calc()` or `color-mix()`.
