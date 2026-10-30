# contour-ui — agent & contributor guide

Design system for audio-plugin UIs and general web UI with a layered
architecture. pnpm monorepo, single toolchain: **Vite+** (`vp`).

## Layers

All published packages live under `@contour-ui/` in `packages/`. Dependencies
point **down** the table only — never up, never sideways.

| Layer        | Package          | Purpose                                                                                                                                | May depend on (internal)                     |
| ------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 0 foundation | `tokens`         | DTCG design tokens → CSS vars / TS (Style Dictionary)                                                                                  | —                                            |
| 0 foundation | `icons`          | SVG icons → path data + canvas drawing (Lucide, Simple Icons; no React)                                                                | —                                            |
| 1 logic      | `core`           | framework/renderer-agnostic logic: `machine/`, `states/`, `interactions/`, `collection/`, `positioning/`, `scales/`, `format/`         | —                                            |
| 2 headless   | `headless-react` | unstyled React DOM components + hooks (Ark UI–like)                                                                                    | `core`                                       |
| 3 styled     | `react`          | styled React DOM components in two sections: **Essentials** (the everyday components) and **Audio** (the controls of audio-plugin UIs) | `headless-react`, `tokens`, `icons`          |
| 4 docs       | `fumadocs`       | documentation layout for fumadocs-core sites, built from `react`, in place of `fumadocs-ui`                                            | `react`, `headless-react`, `tokens`, `icons` |

Rules:

- `core` has no React and no DOM (`lib` excludes `DOM`). The only exception is the
  `@contour-ui/core/react` subpath (`src/react/`), with `react` as an **optional** peer. Its tests
  run in Chromium and are the only core files type-checked with DOM types:
  `packages/core/tsconfig.json` is solution-style and references `tsconfig.lib.json` (sources, Node
  tests), `tsconfig.react-test.json` (browser tests) and `tsconfig.config.json` (`vite.config.ts`).
- `core` also runs on Hermes (the Soundor runtime, built without `Intl`): no `Intl`, no
  locale-dependent methods (`toLocale*`, `localeCompare`), no `eval` / `new Function`, no
  `SharedArrayBuffer`, `Atomics`, `Float16Array`. Lint enforces this for `packages/core/src/**`.
- Inside `core`, `states/` and `interactions/` never import each other; both may import `machine/`,
  `collection/` and `positioning/`.
- `headless-react` must not depend on `tokens`, `icons` or the styled package. Peers: `react`,
  `react-dom`.
- The styled package (`react`) and `fumadocs` are styled with plain CSS + token CSS variables. **No
  Tailwind in packages.** Use semantic roles only (`--ct-color-*`, `--ct-space-*`, `--ct-text-*`…),
  never `--ct-base-*`.
- Styled CSS is one file per component (`src/<component>/<component>.css`) with plain rules, added
  to `src/styles.css` as `@import './<component>/<component>.css' layer(contour.components);`.
  Unlayered app CSS overrides it.
- `react` / `react-dom` are never regular `dependencies`; in `headless-react`, the styled package
  and `fumadocs` they are required peers. `fumadocs` also takes `fumadocs-core` as a peer
  (`@types/mdx` as an optional one).

**Enforcement.** The table lives as data in [`scripts/layers.ts`](scripts/layers.ts) — edit it there
only.

- Lint: the root `vite.config.ts` generates oxlint `no-restricted-imports` overrides from it
  (package imports, relative imports into sibling packages, React in core, `states/` ↔
  `interactions/`, Tailwind).
- `vp run boundaries` ([`scripts/check-boundaries.ts`](scripts/check-boundaries.ts)) checks what
  lint cannot: declared dependencies in every `package.json` (even unused ones), React dependency
  kinds, CSS `@import`s, `exports` ↔ `publishConfig.exports` sync, the Changesets `fixed` group, and
  a copy of the root `LICENSE` (MIT) in every package, since npm packs each package's own file.

### Naming

`@contour-ui/[platform-][headless-]framework`. The web (React DOM) is the default platform:
`@contour-ui/react` holds the styled components, `@contour-ui/headless-react` the unstyled ones.
Another framework gets its pair (`vue`, `headless-vue`). The Soundor plugin UI runtime gets
`@contour-ui/soundor` and `@contour-ui/soundor-headless` (**do not create yet**; no `-react` suffix
while Soundor runs React only). Packages free of frameworks and platforms keep plain names
(`tokens`, `icons`, `core`, whose machine hooks in `core/react` serve React DOM and Soundor alike),
and an integration with another ecosystem is named after it: `@contour-ui/fumadocs` is the docs
layout for sites on fumadocs-core.

Private workspaces: apps are `@contour-ui/app-*` (`apps/`), tooling is in `configs/`
(`@contour-ui/typescript-config`, `@contour-ui/vite-config`). Neither is ever published.

## Commands

Vite+ wraps everything; there is no Turborepo, ESLint or Prettier. `vp <cmd>` runs a
built-in; `vp run <name>` runs a `package.json` script or a `vite.config.ts` task.

| Command                                  | What it does                                                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vp install`                             | install (pnpm 12, pinned via `packageManager`)                                                                                                             |
| `vp check` / `vp check --fix`            | format (Oxfmt) + lint (Oxlint, type-aware) + type-check (tsgo)                                                                                             |
| `vp run boundaries`                      | layer boundary check for `package.json` / CSS                                                                                                              |
| `vp test`                                | all Vitest projects: node (core, tokens, icons, client boundaries), Chromium (core's React hooks, UI packages); screenshot tests only with `vp run visual` |
| `vp -C packages/react test`              | one package's tests                                                                                                                                        |
| `vp run -r build`                        | build everything (`vp pack` + publint + attw for packages, apps)                                                                                           |
| `vp run visual` / `vp run visual:update` | screenshot tests (`*.visual.test.tsx`) with Chromium of the pinned Playwright Linux image, in Docker; `:update` rewrites every screenshot                  |
| `vp -C apps/docs run dev` / `run build`  | docs site on http://localhost:5174 (static build → `apps/docs/build/client`)                                                                               |
| `vp -C apps/docs run e2e`                | end-to-end and axe tests of the docs (Playwright) against a fresh static build                                                                             |
| `vp -C apps/playground dev`              | Vite + React sandbox on http://localhost:5173                                                                                                              |
| `vp run changeset`                       | record a changeset (all published packages are versioned together)                                                                                         |
| `vp run ready`                           | everything CI's first three jobs run                                                                                                                       |

Run checks **one task at a time** (`vp check`, then `vp test`, then `vp run -r build`);
narrow with `vp -C <dir>` or `--filter` for focused changes. First time on a machine:
`vp exec playwright install chromium` for browser-mode tests.

**Screenshot tests.** Every state of the styled packages (`react`, `fumadocs`) is a screenshot test
in `src/<component>/<component>.visual.test.tsx`: `visualStates({ '<state>': { render } })` from the
package's `src/test-utils/visual.ts(x)`, on `defineVisualStates()` of
`@contour-ui/vite-config/visual`. Each state, named in lowercase words with dashes, is a test per
theme:

- it is drawn on the canvas of an app page at 1280×720 (`phone: true`: 390×844; `padded: false`
  for a layout drawn to the edges; fumadocs states are pages of the docs site of the fixtures, at
  `params: { pathname, themeToggle }`);
- `ready` takes the steps that lead to the state from the keyboard (`element.focus()`, then Enter
  or Space), not with clicks: a real click leaves `:hover` under the pointer, and Chrome then
  shows no focus ring in the states after it;
- it waits for the element that takes the focus (`focused`) and for running animations, then axe
  checks it in the default theme (every default rule but `region`; `axe: false` with a reason opts
  out);
- the viewport grows to a taller page, as a full-page screenshot, and the canvas, or the whole page
  for overlays in a portal (`target: 'page'`), is compared with
  `__visual__/<test file>/<state>-<theme>.png`.

The browser is Chromium of the pinned Playwright Linux image, because rendering differs between
machines: `vp run visual` ([`scripts/visual.ts`](scripts/visual.ts)) starts `playwright run-server`
in Docker, or uses one already on port 6677, and runs each package's `<name>:visual` project
against it; CI runs `vp run visual:ci` inside that image. Never commit screenshots from another
browser (`CONTOUR_VISUAL=1` without `CONTOUR_VISUAL_SERVER` launches the local one, only to try a
test out). A missing screenshot fails its test (locally, it is written for review). After an
intended visual change, run `vp run visual:update`, which rewrites every screenshot so stale ones
disappear, review the changed PNGs, and commit them.

Lint and format config lives **only** in the root `vite.config.ts` (per-package
rules via `lint.overrides`). Package `vite.config.ts` files hold Vite, Vitest and
`pack` settings only. CI runs `vp check --deny-warnings`: warnings are errors.

`vp check --fix` (and the pre-commit `vp staged`) rewrites `getElementById(id)` to
`querySelector('#' + id)`, which throws for ids that start with a digit: write
``querySelector(`#${CSS.escape(id)}`)``. It also turns `getAttribute('data-x')` into `dataset.x`,
which `noPropertyAccessFromIndexSignature` rejects: write `dataset['x']`.

Browser tests never fake `requestAnimationFrame`: overlay effects start on the next frame (fake
`setTimeout` / `clearTimeout` only). Once a new dependency is reachable from tests, the first
local run with a warm Vite cache may fail in `collectTests` while the optimizer rebundles; run it
again (a cold cache, as in CI, does not).

Browser tests share a page with the files before them: the pointer stays where they left it, and
Chrome gives `:hover` to whatever renders under it a frame or two later (a hovered label hovers its
control too). A test that checks the resting look of an element with a `:hover` rule moves the
pointer off first (`userEvent.unhover(element)`). `toHaveStyle` with camelCase keys reports
"Expected styles could not be parsed" on a mismatch; kebab-case keys show the values. A test
that measures something as wide as its text loads `@contour-ui/tokens/fonts.css` and awaits
`document.fonts.ready` first: the fallback fonts differ between machines, and CI's Linux draws
text wider than macOS.

## Source export condition

Every published package maps its entry points to sources under the custom
`@contour-ui/source` condition, placed before `types` in the dev `exports`:

```json
"exports": {
  ".": { "@contour-ui/source": "./src/index.ts", "types": "./dist/index.d.ts", "default": "./dist/index.js" }
},
"publishConfig": {
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }
}
```

- TypeScript picks it up via `customConditions` (`configs/typescript/base.json`).
- Vite (apps, tests) via the `contourSource()` plugin from `@contour-ui/vite-config`. So the
  playground, docs and tests consume **sources** with HMR, without building packages first.
- pnpm swaps in `publishConfig.exports` on pack/publish, so published consumers never see the
  condition (and `types` comes first there). `vp run boundaries` keeps both maps in sync.
- CSS entry points (`tokens.css`, `styles.css`) are separate exports. Vite's CSS `@import` resolver
  ignores custom conditions, so package CSS does not `@import` other workspace packages: apps load
  `@contour-ui/tokens/tokens.css` and `@contour-ui/tokens/fonts.css`, then
  `@contour-ui/react/styles.css`.
- A `.css` file in `libraryPack()`'s `entry` is bundled by `vp pack` into `dist/<name>.css`
  (Lightning CSS inlines its relative `@import`s and turns `layer()` into `@layer` blocks); files
  passed as `css` (tokens) are copied verbatim, so their `@import`s stay external, and so are
  files passed as `copy` (the tokens' `docs.json`).

## Tokens

`packages/tokens` holds DTCG 2025.10 sources (`contour.resolver.json` + `src/**/*.tokens.json`)
built with **Style Dictionary** into `src/generated/tokens.css` (`--ct-*` custom properties),
`src/generated/vars.ts` (typed `var(--ct-…)` references to semantic tokens) and
`src/generated/docs.json` (every custom property with its value and alias per theme, published
as `@contour-ui/tokens/docs.json`; the docs site's Tokens page reads it). The generated files are
committed;
`vp test` fails when they drift from the sources.

- Dark theme is the default (`:root`); `data-theme="light"` on any element switches its subtree.
- `@contour-ui/tokens/fonts.css` ships the font faces (IBM Plex Sans, JetBrains Mono; Fontsource,
  OFL).
- After editing token JSON: `vp run --filter @contour-ui/tokens tokens` (or `dev` to watch).
- The palette and the color roles are generated: edit `scripts/palette.ts` /
  `scripts/semantic-colors.ts`, then `vp run --filter @contour-ui/tokens generate`.
- Color roles and shadows are per theme (`src/semantic/{color,shadow}.<theme>.tokens.json`); a
  translucent role (`overlay.scrim`) copies its palette color with an alpha in
  `scripts/semantic-colors.ts`.
- Contrast targets for the color roles are tests (`packages/tokens/src/contrast.test.ts`); every
  `syntax.*` role is at least 4.5:1 on `bg.inset`, the code block background.
- Sizes are per-size roles: `size.control-sm|md|lg` are control heights, and `lg` has its own
  label (`text.label-lg`), side padding (`space.control-inset-lg`) and icon gap
  (`space.control-gap-lg`), where `sm` and `md` share `text.label`, `space.control-inset` and
  `space.control-gap`. Overlays take component roles on the `base.size` scale:
  `size.dialog-sm|md|lg`, `size.drawer-sm|md|lg` and `size.popover`. Styled CSS has no px literals:
  a new size is a token first.
- Text styles come in three sets: dense plugin UI (`heading`, `body`, `label`, `label-lg`,
  `value`, `caption`), docs pages (`display`, `title`, `subtitle`, `prose`, `code`) and site pages
  (`hero`, `lead`, `nav`: the title of a home page, the paragraph under it, the links of a site
  header). A size, line height or letter spacing a style needs is a base step first
  (`base.font-size.*`, `base.line-height.*`, `base.letter-spacing.*`). `letter-spacing` is not part
  of the `font` shorthand: set `--ct-text-<style>-letter-spacing` beside it.
- Every token stays expressible in Soundor (`packages/tokens/src/soundor.test.ts`): colors inside
  sRGB, lengths in px, a named easing for every `cubicBezier`, no `calc()` / `color-mix()` in
  values.

See [`packages/tokens/README.md`](packages/tokens/README.md).

## Icons

`packages/icons` compiles [Lucide](https://lucide.dev) icons (`lucide-static`) and brand logos from
Simple Icons into `src/generated/icons.ts` (committed): paths with only absolute `M`, `L`, `C`,
`Q`, `Z`, as `d` strings for SVG and numeric `commands` for Canvas 2D, one `<camelName>Icon` export
each, plus `drawIcon` (a structural canvas context, no `Path2D`). No React here: the styled `Icon`
renders the data as `<svg>` (`1em`, `currentColor`); components that hold icons size them in their
CSS with `--ct-size-icon-*`.

- To add an icon, list it in `scripts/icon-list.ts`, then run
  `vp run --filter @contour-ui/icons icons`. `vp test` fails when the generated file is stale.
- The package README carries the Lucide license (ISC, plus MIT for the icons derived from
  Feather) and ships with the package; a test keeps it equal to `lucide-static/LICENSE`.

## Components

The guide's "Anatomy of a component" (`apps/docs/content/docs/guide/index.mdx`) is the public
version of these rules.

- **Where a component lives.** Behavior lives in `core` (state machines) and `headless-react` (DOM
  parts with ARIA and keyboard handling); styles live in the styled package, `react`. A component
  without behavior (button, card, alert, kbd…) exists only there.
- **Exports.** A single-element component is a plain component (`Button`, `Kbd`). A multi-part
  component is a namespace of parts: `export * as Card from './card/index.ts'` gives `Card.Root`,
  `Card.Title`.
- **Parts.** Each part renders one element through `Primitive.<element>` from `headless-react`, so
  it supports `asChild`, and passes its element's props through. A part combines its own props with
  the user's as `mergeProps(ownProps, props)` and refs with `useComposedRefs`. Every part, in
  headless and styled, carries `data-scope` (component) and `data-part` (part; `root` for a
  single-element component), and its state as `data-state` and the like. `Icon` is the exception to
  `Primitive`: it renders its `<svg>` directly. Parts that point at each other by id
  (`aria-labelledby`, `aria-controls`) register through a stable ref callback that reads the
  element's `id`, so an `id` given to a part is followed.
- **Behavior.** A machine names what it needs from its environment (platform actions and effects);
  the `headless-react` hook implements them for the DOM. DOM-only options (part elements,
  `initialFocusEl`, `scrollEl`…) never enter the machine's schema: the hook creates its platform
  once per instance (`useState`) and hands it the latest options with `setOptions` in
  `useInsertionEffect`, since the React Compiler lint `react(refs)` rejects a ref passed to a
  factory during render (see `headless-react/src/dialog/use-dialog.ts`). `watch` compares props by
  identity: a hook passes arrays that owners rebuild on every render through a value comparison
  first.
- **Platform modules.** `packages/headless-react/src/platform/` holds the DOM side of what machines
  ask for: the clock, positioning (`trackPosition`), the overlay layer stack (`trackLayer`: Escape
  and presses outside reach the top layer only; nested layers close with their parent), the focus
  trap and focus moves, scroll lock, `inert` outside a modal layer, scrolling inside a container,
  tabbable elements, the indicator of a selected element. They are internal, not exported, and each
  waits for its element itself: effects start as the machine enters a state, often before React has
  rendered it.
  - `trackIndicator` (`indicator.ts`, for Tabs and SegmentGroup) writes `--left`, `--top`,
    `--width` and `--height` (px, relative to the padding box of the indicator's parent, in its
    scrolled content) and owns the indicator's `hidden`: a part renders `hidden` and never these
    variables in `style`. The offsets are physical, in right-to-left text too.
  - Restoring focus counts focus left in a layer opened above the closing one, which closed with
    it and still animates out, as inside it. An overlay that has its size as it renders reveals its
    initial focus inside its own scroll container (`moveFocusIn(…, { reveal: true })`, Dialog); a
    popover does it after its first position. The page never scrolls.
- **React Server Components.** `react`, `headless-react` and `fumadocs` build with
  `libraryPack({ unbundle: true })`, one file per module, so each module keeps its `'use client'`
  (a bundle drops directives). A module starts with `'use client'` when it imports from `react`
  what its server build lacks (state and effect hooks, `createContext`, `use`) or anything from
  `react-dom`, passes an event handler in JSX, provides a context, renders a client component with
  `asChild` (its child must be made on the client, where it can be cloned), or takes a value other
  than a component (a hook, a function, an object) from a module that needs the browser, in its
  own package or another one. Everything else stays a server module: entry points, namespaces
  (`export * as Card`), `Primitive`, `mergeProps`, pure utils and parts that only render markup,
  so a server component imports `@contour-ui/react` and renders `Card.Root`.
  `describeClientBoundary()` (`@contour-ui/vite-config/client-boundary`) fails on missing and on
  needless directives, in each package's `<package>:node` Vitest project. `core` carries none:
  `core/react` holds hooks only, which run in client modules.
- **Overlays.** Users compose `Portal` around the positioner, as in Ark (the styled package
  re-exports it). One `usePresence` in Root drives Positioner and Content, its ref on the animated
  Content; Backdrop has its own. The layer stack writes `--layer-index` inline on the content, the
  positioner and the backdrop, so parts never render it in `style`; the styled package stacks them
  with `z-index: calc(var(--ct-layer-overlay) + var(--layer-index, 0))`. The x of the styled Dialog
  and Drawer (`CloseTrigger`) is a `CloseButton` of size `md`: the 24px target of WCAG 2.2 (2.5.8).
- **A field over a list** (`Listbox.Input`) is a combobox: `role="combobox"`, `aria-expanded`,
  `aria-controls` and `aria-activedescendant` on the field. Screen readers announce its options,
  and axe does not ask the list, which scrolls while the field keeps the focus, to take focus.
- **A button that keeps its name** (an `aria-label` that stays while its state changes, as copy
  buttons do) keeps its visible text too: a state swaps an icon, not the text. axe's
  `label-content-name-mismatch` (WCAG 2.5.3) reads the text on screen, `aria-hidden` included, so
  the styled Clipboard's trigger stays "Copy" while its icon turns into a check mark.
- **Styles.** Classes `contour-<component>` on the root or the single element and
  `contour-<component>__<part>` on the other parts, joined with the user's `className` by `cx`
  (`packages/react/src/utils/cx.ts`). Variants and sizes are attributes, `data-variant` and
  `data-size`, always rendered with the resolved value (defaults included), so selectors read
  `.contour-button[data-variant='solid']`. CSS: one file per component (see "Layers"); it relies
  on no reset (neither the tests nor the docs site have one), so parts set their own
  font and colors and reset the default margins of their elements (`p`, `h3`). A root sets no
  margin (unless its element has a default one, as `<button>` may), so its container spaces it,
  even from a lower cascade layer, as the docs site's Prose does. Text takes `fg-default` or
  `fg-muted` (`fg-subtle` is 3:1, below what axe asks of text).
- **Motion.** An overlay's closed state runs `@keyframes` of its own: Presence waits for it,
  and a reversed open animation keeps its name and does not run again. A part that sets `display`
  restores `[hidden] { display: none }`. Under `prefers-reduced-motion: reduce`, CSS drops
  movement (translate, scale, slides) and keeps opacity and color changes. Content that animates
  its height (Collapsible) runs `@keyframes` to and from `var(--height)`, which headless measures,
  with `overflow: hidden` inside the keyframes, so it clips only while it animates; content open on
  the first render carries `animation-name: none` until it first closes.

## Docs

The docs site (`apps/docs`) documents what ships: a **Guide** (how the packages fit together,
installation, themes, styling with tokens) and a section per part — **Essentials** and **Audio**
(the two sections of `@contour-ui/react`), **Headless**, **Fumadocs** — as root folders under
`content/docs/` (`essentials/`, `audio/`, `headless/`, `fumadocs/`). It runs on React
Router (prerendered) with `fumadocs-core` (page tree, search index, neighbours, TOC data) and
`fumadocs-mdx` (content); its layout is the package `@contour-ui/fumadocs` (`packages/fumadocs/`),
of which it is the first consumer. When a component lands, add
`content/docs/<section>/<component>.mdx` (live example in `<Preview>`, anatomy, props, tokens) and
list it in that section's `meta.json` and on the section's index page. Live examples import the
component at the top of the page (`import { Button } from '@contour-ui/react';`); MDX imports
resolve to package sources like the rest of the app.

**The layout package** (`@contour-ui/fumadocs`):

- **Layouts** (`src/layout/`, `src/page/`): `DocsLayout` (a sidebar from 48rem with the section
  switcher and the page tree, collapsible; below 48rem a sticky header whose menu opens a Drawer)
  around `DocsPage` (`main#content`, the "On this page" bar until 80rem and the column from 80rem),
  and `HomeLayout`, all inside `DocsProvider` (site, search, theme) under the app's framework
  adapter. Links, the pathname and navigation come only from `fumadocs-core/framework`: the
  package never imports `react-router`. The layout root sets `--contour-docs-header-height` and
  `--contour-docs-toc-bar-height` (`0px` where a bar is gone): headings keep their sum free with
  `scroll-margin-block-start`, and the TOC (`src/toc/`, the styled `Toc`) observes the area below.
  Classes are `contour-docs-<part>`, variables `--contour-docs-*`. Folders of the page tree open
  and close on the styled Collapsible (`page-tree-folder.tsx`: the name links to the index page, a
  button after it toggles; open with `defaultOpen` or while they hold the page);
  `"collapsible": false` keeps the static list. `ThemeToggle` takes `mode` (`light-dark`, a
  button, by default; `light-dark-system`, the styled SegmentGroup), by default the `themeToggle` of
  `DocsProvider`.
- **HomeLayout** (`src/layout/home-layout.*`, the `site` header): its root sets
  `--contour-docs-home-width` (80rem), `--contour-docs-page-inset` and
  `--contour-docs-header-height` (3rem on phones, as the docs header there; 4.5rem from 48rem). The
  header has no divider and centers its content in that column with `padding-inline: max(inset,
  (100% - width) / 2)`; a column of a page lines up with `box-sizing: border-box`, `margin-inline:
  auto`, the inset as padding and `max-inline-size: calc(width + 2 * inset)`. Its links are the
  navigation "Main", the styled neutral links in `text.nav` set to `fg-default` and underlined on
  hover; out of room, they scroll in their own box. `search={false}` drops only the search triggers:
  the shortcut stays.
- **Before hydration.** `docsScript()` (`themeScript()` from `@contour-ui/react/theme-script`,
  plus the sidebar) sets `data-theme` (key `contour-theme`) and
  `data-contour-docs-sidebar="collapsed"` (key `contour-docs-sidebar`) on `<html>` before the
  first paint. Components render both states and CSS shows one, as the theme toggle and the
  shortcut of the search button do. The three-way theme picker cannot (`data-theme` does not tell
  `system` from the theme it resolves to): it checks no item until the page has hydrated.
- **Search** (`src/search/`): the styled Dialog with a styled Listbox whose Input is the field, on
  fumadocs-core's static index (`search.from`, `/api/search` by default). A result opens with
  `useRouter().push`; one at the current address only scrolls.
- **MDX** (`@contour-ui/fumadocs/mdx`, `src/mdx/`): `getMdxComponents(overrides?)` draws headings
  as links to themselves; links (a page of the site through the framework's `Link`, a `#fragment`
  as is, another site in a new tab); tables and code blocks with the styled `Table` and `CodeBlock`;
  `<Callout>`, `<Card>` and `<Cards>` (Fumadocs props) with `Alert` and `Card` (a card's title is
  no heading); and registers `Kbd` and `<Preview>`. Images stay plain `img`.
- **Tabs** (`src/mdx/tabs/`): the map holds Fumadocs' `Tabs` and `Tab` (and `TabsList`,
  `TabsTrigger`, `TabsContent`) and the `CodeBlockTabs*` that `remarkCodeTab` and `remarkNpm`
  write, on the styled `line` Tabs, controlled by `useDocsTabs`. A `groupId` group lives in a module
  registry (`tab-groups.ts`) and is stored under its id in `sessionStorage` (and `localStorage`
  with `persist`), as in fumadocs-ui; the address opens the tab whose panel is or holds `#id`;
  `updateAnchor` writes with `replaceState(history.state, …)`. Values are the items as written.
- **Styles.** `@contour-ui/fumadocs/styles.css` loads before `@contour-ui/react/styles.css`: it
  starts with the layer order `contour.fumadocs-base, contour.fumadocs-prose, contour.components,
  contour.fumadocs`. The page base (no reset, so the components render as in their tests) and Prose
  rank below the components, so components inside the content keep their styles; the layout and the
  docs components rank above the styled parts they adjust. Prose relies on no reset either (it sets
  the margins, list markers and fonts of what it styles); `contour-docs-not-prose` opts a subtree
  out, and `<Preview>` uses it.
- **React Server Components** (the rule is under Components). `docsScript()`, `getMdxComponents()`,
  `Prose`, `Preview`, `HomeLayout` and the entry barrels stay server modules: they read the styled
  parts from their namespaces and take the package's own client components by name (on a server, an
  object exported by a client module is a client reference, and spreading it yields nothing). The
  public layouts take serializable props only. `src/client-boundary.test.ts` (`fumadocs:node`) runs
  the shared check with those server modules, and checks that no module imports `react-router`.
- **Tests** render the package as a docs site from `src/test-utils/`: `MemoryFramework`
  (fumadocs-core's `FrameworkProvider` with an in-memory pathname; `push` changes it in a
  transition, as routers do; `Link` is a plain `<a data-framework-link>`), `renderDocs()`, and
  `visualStates` for screenshot tests (each state a page at its `params.pathname`, with the search
  on a real static index built in the browser, started afresh; page states set `padded: false`, and
  `params.themeToggle: 'light-dark-system'` for the three-way picker). testing-library takes a
  `<header>` inside `<main>` for a banner: find landmarks by name. Click an icon-only SegmentGroup
  item through its label (`radio.closest('label')`): the icon covers the hidden radio.

**The site** (`apps/docs`) keeps its routes (`docs.tsx` with its loader, `clientLoader` and error
boundary, `home.tsx`, `not-found.tsx`), `lib/source.ts`, the search index route
(`routes/search.ts`), the Contour logo (`app/components/contour-logo.tsx`, the site's brand: the
lockup, the mark alone below 30rem; its favicons are in `public/`), the parts of the home page
(`app/components/home/`: the hero, the sequencer of the parts of contour-ui, the docs index), the
components of the Tokens page (`app/components/tokens/`: built from `@contour-ui/tokens/docs.json`
as the page renders, each color group in a panel per theme with `data-theme`, the contrast of
text roles computed from their `oklch()` values), and its own CSS (`app/app.css`, unlayered,
loaded after every package stylesheet).

- The home page is built from `@contour-ui/react` and the tokens only. A component that does not
  ship yet is the styled `Placeholder` in its clip of the sequencer; swap in the real one as it
  lands.

- Code is highlighted at build time with Shiki's css-variables theme (`rehypeCodeOptions` in
  `vite.config.ts`); `CodeBlock` maps its variables to the syntax tokens. A lowercase JSX tag in
  MDX (`<kbd>`, `<a>`) is a literal element and skips the MDX map: write `<Kbd>`.
- Install commands are ` ```package-install ` blocks: one tab group across the site
  (`remarkNpmOptions.persist.id: 'package-manager'`). In tests, `name: 'npm'` also matches
  `pnpm`: pass `exact: true`.
- Oxfmt formats MDX like JSX: the text of an element with several attributes goes on a line of its
  own, where MDX turns it into a paragraph, even inside a `<button>`. Write inline examples as an
  expression (`{<p>…</p>}`).
- App-only components are named `docs-<name>` and use plain CSS with semantic tokens.
- A new page under `content/docs` shows "Not found" on the dev server until it restarts: in SPA mode
  it serves loader data only for the paths `prerender()` returned at startup.
- **End-to-end tests** (`apps/docs/e2e/`, `vp -C apps/docs run e2e`): Playwright against the
  static build served as a static host serves it, and axe on key pages in both themes. Find
  elements by role and name, scoped to the banner or the sidebar where page examples share a
  name, and wait for what a user would see (focus moved into an overlay) before pressing keys.

## Adding a package

1. Add a row to `LAYERS` in `scripts/layers.ts` (name, layer, allowed deps, React policy) and the
   package name to the `fixed` group in `.changeset/config.json`.
2. Create `packages/<name>/` by copying the closest sibling: `package.json` (ESM only,
   `sideEffects`, `files: ["dist"]`, dev + publish `exports`, `publishConfig.access: public`,
   deps via `catalog:` / `workspace:*`), `tsconfig.json` (extends a `@contour-ui/typescript-config`
   preset), `vite.config.ts` (`libraryPack()`, tests), `README.md` (layer, purpose, allowed deps),
   `LICENSE` (a copy of the root one).
3. UI packages: React packages build with `libraryPack({ unbundle: true })` and call
   `describeClientBoundary()` in `src/client-boundary.test.ts`, run by a `<package>:node` Vitest
   project (environment `node`, excluded from the browser project). A styled package gets
   screenshot tests: `src/test-utils/visual.ts` with `defineVisualStates()` (its themes, canvas and
   stylesheets), `VISUAL_TESTS` excluded from its browser project, and `...visualProjects('<name>')`
   in its `test.projects`.
4. New external dependencies go into the `catalog` in `pnpm-workspace.yaml` first (`catalogMode:
   strict`).
5. `vp install && vp check && vp run boundaries && vp test && vp run -r build`.

## Git

- Code, comments, docs and commit messages are written in English.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
  `type(scope): subject`, imperative, starting lowercase, no trailing period, header within 72
  characters, body separated by a blank line. Types: `feat`, `fix`, `docs`, `test`, `refactor`,
  `perf`, `style`, `build`, `ci`, `chore`, `revert`. Scopes: a package (`tokens`, `icons`, `core`,
  `headless-react`, `react`, `fumadocs`) or `docs`, `playground`, `config`, `repo`; no
  scope when a change spans several packages.
- Hooks live in `.vite-hooks/` (installed by `vp config` on `vp install`): `pre-commit` runs
  `vp staged` (`vp check --fix` on staged files), `commit-msg` runs
  [`scripts/check-commit-msg.ts`](scripts/check-commit-msg.ts).
- A change to a published package carries its changeset (`vp run changeset`) in the same commit.

## Versions

Node 24 LTS (`.nvmrc`), pnpm 12 (`packageManager`; older pnpm fails on `engines.pnpm`),
Vite+ 1.4 (bundles Vite 8, Vitest 5, Oxlint, Oxfmt, tsdown). `vite` in the catalog is aliased
to `@voidzero-dev/vite-plus-core` so React Router and Vite plugins use the same Vite as `vp`.
Run `vp toolchain` for the exact tool graph and `vp env doctor` when the environment looks wrong.
