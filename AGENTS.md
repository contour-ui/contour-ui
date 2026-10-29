# contour-ui — agent & contributor guide

Design system for audio-plugin UIs and general web UI with a layered
architecture. pnpm monorepo, single toolchain: **Vite+** (`vp`).

## Layers

All published packages live under `@contour-ui/` in `packages/`. Dependencies
point **down** the table only — never up, never sideways — with one exception:
`audio → kit`.

| Layer        | Package    | Purpose                                                                                                                        | May depend on (internal)             |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| 0 foundation | `tokens`   | DTCG design tokens → CSS vars / TS (Style Dictionary)                                                                          | —                                    |
| 0 foundation | `icons`    | SVG icons → path data + canvas drawing (Lucide, Simple Icons; no React)                                                        | —                                    |
| 1 logic      | `core`     | framework/renderer-agnostic logic: `machine/`, `states/`, `interactions/`, `collection/`, `positioning/`, `scales/`, `format/` | —                                    |
| 2 headless   | `headless` | unstyled React DOM components + hooks (Ark UI–like)                                                                            | `core`                               |
| 3 kit        | `kit`      | styled general-purpose components                                                                                              | `headless`, `tokens`, `icons`        |
| 3 kit        | `audio`    | styled audio components                                                                                                        | `headless`, `tokens`, `icons`, `kit` |
| 4 docs       | `fumadocs` | documentation layout for fumadocs-core sites, built from Kit, in place of `fumadocs-ui`                                        | `kit`, `headless`, `tokens`, `icons` |

Rules:

- `core` has no React and no DOM (`lib` excludes `DOM`). The only exception is the
  `@contour-ui/core/react` subpath (`src/react/`), with `react` as an **optional** peer. Its
  tests run in Chromium and are the only core files type-checked with DOM types:
  `packages/core/tsconfig.json` is solution-style and references `tsconfig.lib.json` (sources,
  Node tests), `tsconfig.react-test.json` (browser tests) and `tsconfig.config.json` (`vite.config.ts`).
- `core` also runs on Hermes (the Soundor runtime, built without `Intl`): no `Intl`, no
  locale-dependent methods (`toLocale*`, `localeCompare`), no `eval` / `new Function`, no
  `SharedArrayBuffer`, `Atomics`, `Float16Array`. Lint enforces this for `packages/core/src/**`.
- Inside `core`, `states/` and `interactions/` never import each other; both may import `machine/`,
  `collection/` and `positioning/`.
- `headless` must not depend on `tokens`, `icons`, `kit`, `audio`. Peers: `react`, `react-dom`.
- Kits (`kit`, `audio`) and `fumadocs` are styled with plain CSS + token CSS variables. **No Tailwind in packages.**
  Use semantic roles only (`--ct-color-*`, `--ct-space-*`, `--ct-text-*`…), never `--ct-base-*`.
- Kit CSS is one file per component (`src/<component>/<component>.css`) with plain rules, added to
  `src/styles.css` as `@import './<component>/<component>.css' layer(contour.kit);` (audio:
  `layer(contour.audio)`; its entry declares `@layer contour.kit, contour.audio;` so audio always
  ranks above kit). Unlayered app CSS overrides both.
- `react` / `react-dom` are never regular `dependencies`; in `headless`, the kits and `fumadocs` they are required
  peers. `fumadocs` also takes `fumadocs-core` as a peer (`@types/mdx` as an optional one).

**Enforcement.** The table lives as data in [`scripts/layers.ts`](scripts/layers.ts) — edit it there only.

- Lint: the root `vite.config.ts` generates oxlint `no-restricted-imports` overrides from it
  (package imports, relative imports into sibling packages, React in core, `states/` ↔ `interactions/`, Tailwind).
- `vp run boundaries` ([`scripts/check-boundaries.ts`](scripts/check-boundaries.ts)) checks what lint
  cannot: declared dependencies in every `package.json` (even unused ones), React dependency kinds,
  CSS `@import`s, `exports` ↔ `publishConfig.exports` sync, the Changesets `fixed` group, and a
  copy of the root `LICENSE` (MIT) in every package, since npm packs each package's own file.

### Naming

`@contour-ui/{layer}[-{target}]`. The default target is React DOM, so `headless`,
`kit`, `audio` are the React DOM packages. Reserved for the Soundor plugin UI
runtime adapters (**do not create yet**): `headless-soundor`, `kit-soundor`, `audio-soundor`.
An integration with another ecosystem is named after it, outside that scheme:
`@contour-ui/fumadocs` is the docs layout for sites on fumadocs-core.

Private workspaces: apps are `@contour-ui/app-*` (`apps/`), tooling is in `configs/`
(`@contour-ui/typescript-config`, `@contour-ui/vite-config`). Neither is ever published.

## Commands

Vite+ wraps everything; there is no Turborepo, ESLint or Prettier. `vp <cmd>` runs a
built-in; `vp run <name>` runs a `package.json` script or a `vite.config.ts` task.

| Command                                  | What it does                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `vp install`                             | install (pnpm 12, pinned via `packageManager`)                                                                                   |
| `vp check` / `vp check --fix`            | format (Oxfmt) + lint (Oxlint, type-aware) + type-check (tsgo)                                                                   |
| `vp run boundaries`                      | layer boundary check for `package.json` / CSS                                                                                    |
| `vp test`                                | all Vitest projects: node (core, tokens, icons, client boundaries), Chromium (core's React hooks, UI packages), stories-as-tests |
| `vp -C packages/kit test`                | one package's tests                                                                                                              |
| `vp run -r build`                        | build everything (`vp pack` + publint + attw for packages, apps)                                                                 |
| `vp run storybook`                       | every package Storybook + the composition host on http://localhost:6100                                                          |
| `vp -C packages/kit run storybook`       | one package Storybook (tokens 6101, headless 6102, kit 6103, audio 6104, fumadocs 6105)                                          |
| `vp run build-storybook`                 | all Storybooks → one deployable folder `apps/storybook/storybook-static`                                                         |
| `vp run visual` / `vp run visual:update` | screenshot tests of the styled Storybooks in the pinned Playwright Linux image (Docker); `:update` rewrites changed screenshots  |
| `vp -C apps/docs run dev` / `run build`  | docs site on http://localhost:5174 (static build → `apps/docs/build/client`)                                                     |
| `vp -C apps/docs run e2e`                | end-to-end and axe tests of the docs (Playwright) against a fresh static build                                                   |
| `vp -C apps/playground dev`              | Vite + React sandbox on http://localhost:5173                                                                                    |
| `vp run changeset`                       | record a changeset (all published packages are versioned together)                                                               |
| `vp run ready`                           | everything CI's first three jobs run                                                                                             |

Run checks **one task at a time** (`vp check`, then `vp test`, then `vp run -r build`);
narrow with `vp -C <dir>` or `--filter` for focused changes. First time on a machine:
`vp exec playwright install chromium` for browser-mode tests.

**Visual tests.** Every story of the `tokens`, `kit`, `audio` and `fumadocs` Storybooks is screenshotted in
each theme (Playwright, `apps/storybook/visual/`, screenshots in `visual/__snapshots__/`), at
1280×720; a story tagged `phone` at 390×844 (write `tags: ['phone']` and
`globals: { viewport: { value: 'phone' } }` in the story's own literal: the indexer reads tags
statically). They run
against the static build, in Docker locally and in the same image in CI, because rendering differs
between machines: never commit screenshots made outside that image. After an intended visual
change, run `vp run visual:update`, review the changed PNGs, and commit them. A story opts out with
`tags: ['!visual']`.

Lint and format config lives **only** in the root `vite.config.ts` (per-package
rules via `lint.overrides`). Package `vite.config.ts` files hold Vite, Vitest and
`pack` settings only. CI runs `vp check --deny-warnings`: warnings are errors.

`vp check --fix` (and the pre-commit `vp staged`) rewrites `getElementById(id)` to
`querySelector('#' + id)`, which throws for ids that start with a digit: write
``querySelector(`#${CSS.escape(id)}`)``. It also turns `getAttribute('data-x')` into `dataset.x`,
which `noPropertyAccessFromIndexSignature` rejects: write `dataset['x']`.

Browser tests never fake `requestAnimationFrame`: overlay effects start on the next frame (fake
`setTimeout` / `clearTimeout` only). Once a new dependency is reachable from stories, the first
local run with a warm Vite cache may fail in `collectTests` while the optimizer rebundles; run it
again (a cold cache, as in CI, does not).

Browser tests share a page with the files before them: the pointer stays where they left it, and
Chrome gives `:hover` to whatever renders under it a frame or two later (a hovered label hovers its
control too). A test that checks the resting look of an element with a `:hover` rule moves the
pointer off first (`userEvent.unhover(element)`). `toHaveStyle` with camelCase keys reports
"Expected styles could not be parsed" on a mismatch; kebab-case keys show the values.

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
- Vite (apps, Storybook, tests) via the `contourSource()` plugin from `@contour-ui/vite-config`.
  So the playground, Storybook, docs and tests consume **sources** with HMR, without building packages first.
- pnpm swaps in `publishConfig.exports` on pack/publish, so published consumers never see the
  condition (and `types` comes first there). `vp run boundaries` keeps both maps in sync.
- CSS entry points (`tokens.css`, `styles.css`) are separate exports. Vite's CSS `@import`
  resolver ignores custom conditions, so package CSS does not `@import` other workspace packages: apps
  load `@contour-ui/tokens/tokens.css` and `@contour-ui/tokens/fonts.css`, then
  `@contour-ui/kit/styles.css`, then `@contour-ui/audio/styles.css`.
- A `.css` file in `libraryPack()`'s `entry` is bundled by `vp pack` into `dist/<name>.css`
  (Lightning CSS inlines its relative `@import`s and turns `layer()` into `@layer` blocks); files
  passed as `css` (tokens) are copied verbatim, so their `@import`s stay external.

## Tokens

`packages/tokens` holds DTCG 2025.10 sources (`contour.resolver.json` + `src/**/*.tokens.json`)
built with **Style Dictionary** into `src/generated/tokens.css` (`--ct-*` custom properties),
`src/generated/vars.ts` (typed `var(--ct-…)` references to semantic tokens) and
`src/generated/docs.json` (every custom property with its value and alias per theme; the
Storybook token tables read it, it is not published). The generated files are committed;
`vp test` fails when they drift from the sources.

- Dark theme is the default (`:root`); `data-theme="light"` on any element switches its subtree.
- `@contour-ui/tokens/fonts.css` ships the font faces (IBM Plex Sans, JetBrains Mono; Fontsource, OFL).
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
  `size.dialog-sm|md|lg`, `size.drawer-sm|md|lg` and `size.popover`. Kit CSS has no px literals:
  a new size is a token first.
- Every token stays expressible in Soundor (`packages/tokens/src/soundor.test.ts`): colors inside
  sRGB, lengths in px, a named easing for every `cubicBezier`, no `calc()` / `color-mix()` in values.

See [`packages/tokens/README.md`](packages/tokens/README.md).

## Icons

`packages/icons` compiles [Lucide](https://lucide.dev) icons (`lucide-static`) and brand logos from
Simple Icons into `src/generated/icons.ts` (committed): paths with only absolute `M`, `L`, `C`,
`Q`, `Z`, as `d` strings for SVG and numeric `commands` for Canvas 2D, one `<camelName>Icon` export
each, plus `drawIcon` (a structural canvas context, no `Path2D`). No React here: kit's `Icon`
renders the data as `<svg>` (`1em`, `currentColor`); components that hold icons size them in their
CSS with `--ct-size-icon-*`.

- To add an icon, list it in `scripts/icon-list.ts`, then run
  `vp run --filter @contour-ui/icons icons`. `vp test` fails when the generated file is stale.
- The package README carries the Lucide license (ISC, plus MIT for the icons derived from
  Feather) and ships with the package; a test keeps it equal to `lucide-static/LICENSE`.

## Components

The guide's "Anatomy of a component" (`apps/docs/content/docs/guide/index.mdx`) is the public
version of these rules.

- **Where a component lives.** Behavior lives in `core` (state machines) and `headless` (DOM
  parts with ARIA and keyboard handling); styles live in the kits. A component without behavior
  (button, card, alert, kbd…) exists only in `kit` / `audio`.
- **Exports.** A single-element component is a plain component (`Button`, `Kbd`). A multi-part
  component is a namespace of parts: `export * as Card from './card/index.ts'` gives `Card.Root`,
  `Card.Title`.
- **Parts.** Each part renders one element through `Primitive.<element>` from `headless`, so it
  supports `asChild`, and passes its element's props through. A part combines its own props with
  the user's as `mergeProps(ownProps, props)` and refs with `useComposedRefs`. Every part, in
  headless and in the kits, carries `data-scope` (component) and `data-part` (part; `root` for a
  single-element component), and its state as `data-state` and the like. `Icon` is the exception
  to `Primitive`: it renders its `<svg>` directly. Parts that point at each other by id
  (`aria-labelledby`, `aria-controls`) register through a stable ref callback that reads the
  element's `id`, so an `id` given to a part is followed.
- **Behavior.** A machine names what it needs from its environment (platform actions and effects);
  the `headless` hook implements them for the DOM. DOM-only options (part elements,
  `initialFocusEl`, `scrollEl`…) never enter the machine's schema: the hook creates its platform
  once per instance (`useState`) and hands it the latest options with `setOptions` in
  `useInsertionEffect`, since the React Compiler lint `react(refs)` rejects a ref passed to a
  factory during render (see `headless/src/dialog/use-dialog.ts`). `watch` compares props by
  identity: a hook passes arrays that owners rebuild on every render through a value comparison
  first.
- **Platform modules.** `packages/headless/src/platform/` holds the DOM side of what machines ask
  for: the clock, positioning (`trackPosition`), the overlay layer stack (`trackLayer`: Escape and
  presses outside reach the top layer only; nested layers close with their parent), the focus
  trap and focus moves, scroll lock, `inert` outside a modal layer, scrolling inside a container,
  tabbable elements, the indicator of a selected element. They are internal, not exported, and
  each waits for its element itself: effects start as the machine enters a state, often before
  React has rendered it.
  - `trackIndicator` (`indicator.ts`, for Tabs and SegmentGroup) writes `--left`, `--top`,
    `--width` and `--height` (px, relative to the padding box of the indicator's parent, in its
    scrolled content) and owns the indicator's `hidden`: a part renders `hidden` and never these
    variables in `style`. The offsets are physical, in right-to-left text too.
  - Restoring focus counts focus left in a layer opened above the closing one, which closed with
    it and still animates out, as inside it. An overlay that has its size as it renders reveals its
    initial focus inside its own scroll container (`moveFocusIn(…, { reveal: true })`, Dialog); a
    popover does it after its first position. The page never scrolls.
- **React Server Components.** Kit, headless and fumadocs build with
  `libraryPack({ unbundle: true })`, one file per module, so each module keeps its `'use client'`
  (a bundle drops directives). A module starts with `'use client'` when it imports from `react`
  what its server build lacks (state and effect hooks, `createContext`, `use`) or anything from
  `react-dom`, passes an event handler in JSX, provides a context, renders a client component with
  `asChild` (its child must be made on the client, where it can be cloned), or takes a value other
  than a component (a hook, a function, an object) from a module that needs the browser, in its
  own package or another one. Everything else stays a server module: entry points, namespaces
  (`export * as Card`), `Primitive`, `mergeProps`, pure utils and parts that only render markup,
  so a server component imports `@contour-ui/kit` and renders `Card.Root`.
  `describeClientBoundary()` (`@contour-ui/vite-config/client-boundary`) fails on missing and on
  needless directives, in each package's `<package>:node` Vitest project. `core` carries none:
  `core/react` holds hooks only, which run in client modules.
- **Overlays.** Users compose `Portal` around the positioner, as in Ark (Kit re-exports it). One
  `usePresence` in Root drives Positioner and Content, its ref on the animated Content; Backdrop
  has its own. The layer stack writes `--layer-index` inline on the content, the positioner and
  the backdrop, so parts never render it in `style`; kits stack them with
  `z-index: calc(var(--ct-layer-overlay) + var(--layer-index, 0))`. The x of Kit's Dialog and
  Drawer (`CloseTrigger`) is a `CloseButton` of size `md`: the 24px target of WCAG 2.2 (2.5.8).
- **A field over a list** (`Listbox.Input`) is a combobox: `role="combobox"`, `aria-expanded`,
  `aria-controls` and `aria-activedescendant` on the field. Screen readers announce its options,
  and axe does not ask the list, which scrolls while the field keeps the focus, to take focus.
- **Kit styles.** Classes `contour-<component>` on the root or the single element and
  `contour-<component>__<part>` on the other parts, joined with the user's `className` by `cx`
  (`packages/kit/src/utils/cx.ts`). Variants and sizes are attributes, `data-variant` and
  `data-size`, always rendered with the resolved value (defaults included), so selectors read
  `.contour-button[data-variant='solid']`. CSS: one file per component (see "Layers"); it relies
  on no reset (neither Storybook nor the docs site has one), so parts set their own
  font and colors and reset the default margins of their elements (`p`, `h3`). A root sets no
  margin (unless its element has a default one, as `<button>` may), so its container spaces it,
  even from a lower cascade layer, as the docs site's Prose does. Text takes `fg-default` or
  `fg-muted` (`fg-subtle` is 3:1, below what axe asks of text).
- **Kit motion.** An overlay's closed state runs `@keyframes` of its own: Presence waits for it,
  and a reversed open animation keeps its name and does not run again. A part that sets `display`
  restores `[hidden] { display: none }`. Under `prefers-reduced-motion: reduce`, CSS drops
  movement (translate, scale, slides) and keeps opacity and color changes. Content that animates
  its height (Collapsible) runs `@keyframes` to and from `var(--height)`, which headless measures,
  with `overflow: hidden` inside the keyframes, so it clips only while it animates; content open on
  the first render carries `animation-name: none` until it first closes.

## Docs

The docs site (`apps/docs`) documents what ships: a **Guide** (how the packages fit together,
installation, themes, styling with tokens) and one section per shipped package — **Kit**,
**Audio**, **Headless**, **Fumadocs** — as root folders under `content/docs/`. It runs on React
Router (prerendered) with `fumadocs-core` (page tree, search index, neighbours, TOC data) and
`fumadocs-mdx` (content); its layout is the package `@contour-ui/fumadocs` (`packages/fumadocs/`),
of which it is the first consumer. When a component lands, add
`content/docs/<package>/<component>.mdx` (live example in `<Preview>`, anatomy, props, tokens) and
list it in that section's `meta.json` and on the section's index page. Live examples import the
component at the top of the page (`import { Button } from '@contour-ui/kit';`); MDX imports
resolve to package sources like the rest of the app.

**The layout package** (`@contour-ui/fumadocs`):

- **Layouts** (`src/layout/`, `src/page/`): `DocsLayout` (a sidebar from 48rem with the section
  switcher and the page tree, collapsible; below 48rem a sticky header whose menu opens a Drawer)
  around `DocsPage` (`main#content`, the "On this page" bar until 80rem and the column from 80rem),
  and `HomeLayout`, all inside `DocsProvider` (site, search, theme) under the app's framework
  adapter. Links, the pathname and navigation come only from `fumadocs-core/framework`: the
  package never imports `react-router`. The layout root sets `--contour-docs-header-height` and
  `--contour-docs-toc-bar-height` (`0px` where a bar is gone): headings keep their sum free with
  `scroll-margin-block-start`, and the TOC (`src/toc/`, Kit's `Toc`) observes the area below.
  Classes are `contour-docs-<part>`, variables `--contour-docs-*`.
- **Before hydration.** `docsScript()` (Kit's `themeScript()` from `@contour-ui/kit/theme-script`,
  plus the sidebar) sets `data-theme` (key `contour-theme`) and
  `data-contour-docs-sidebar="collapsed"` (key `contour-docs-sidebar`) on `<html>` before the
  first paint. Components render both states and CSS shows one, as the theme toggle and the
  shortcut of the search button do.
- **Search** (`src/search/`): Kit's Dialog with a Kit Listbox whose Input is the field, on
  fumadocs-core's static index (`search.from`, `/api/search` by default). A result opens with
  `useRouter().push`; one at the current address only scrolls.
- **MDX** (`@contour-ui/fumadocs/mdx`, `src/mdx/`): `getMdxComponents(overrides?)` draws headings
  as links to themselves; links (a page of the site through the framework's `Link`, a `#fragment`
  as is, another site in a new tab); tables and code blocks with Kit's `Table` and `CodeBlock`;
  `<Callout>`, `<Card>` and `<Cards>` (Fumadocs props) with `Alert` and `Card` (a card's title is
  no heading); and registers `Kbd` and `<Preview>`. Images stay plain `img`.
- **Styles.** `@contour-ui/fumadocs/styles.css` loads before Kit's: it starts with the layer order
  `contour.fumadocs-base, contour.fumadocs-prose, contour.kit, contour.audio, contour.fumadocs`.
  The page base (no reset, so Kit renders as in Storybook) and Prose rank below the components, so
  components inside the content keep their styles; the layout and the docs components rank above
  the Kit parts they adjust. Prose relies on no reset either (it sets the margins, list markers and
  fonts of what it styles); `contour-docs-not-prose` opts a subtree out, and `<Preview>` uses it.
- **React Server Components** (the rule is under Components). `docsScript()`,
  `getMdxComponents()`, `Prose`, `Preview`, `HomeLayout` and the entry barrels stay server
  modules: they read Kit's parts from its namespaces and take the package's own client components
  by name (on a server, an object exported by a client module is a client reference, and
  spreading it yields nothing). The public layouts take serializable props only.
  `src/client-boundary.test.ts` (`fumadocs:node`) runs the shared check with those server modules,
  and checks that no module imports `react-router`.
- **Tests and stories** render the package as a docs site from `src/test-utils/`:
  `MemoryFramework` (fumadocs-core's `FrameworkProvider` with an in-memory pathname; `push`
  changes it in a transition, as routers do; `Link` is a plain `<a data-framework-link>`),
  `renderDocs()` for tests, and the decorator `withDocs` for stories (search on a real static
  index built in the browser). Page stories set `parameters: { canvasPadding: false }`.
  testing-library takes a `<header>` inside `<main>` for a banner: find landmarks by name.

**The site** (`apps/docs`) keeps its routes (`docs.tsx` with its loader, `clientLoader` and error
boundary, `home.tsx`, `not-found.tsx`), `lib/source.ts`, the search index route
(`routes/search.ts`), `app/components/mdx-placeholders.ts` (passed to `getMdxComponents()`), and
its own CSS (`app/app.css`, unlayered, loaded after every package stylesheet).

- Code is highlighted at build time with Shiki's css-variables theme (`rehypeCodeOptions` in
  `vite.config.ts`); `CodeBlock` maps its variables to the syntax tokens. A lowercase JSX tag in
  MDX (`<kbd>`, `<a>`) is a literal element and skips the MDX map: write `<Kbd>`.
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
3. UI packages: add `.storybook/` (`storybookConfig()` from `@contour-ui/vite-config/storybook`),
   a fixed dev port in the `storybook` script, and an entry in `apps/storybook/refs.ts`. Styled
   packages wrap their preview in `withThemes()` (`@contour-ui/vite-config/storybook-preview`) for
   the Theme toolbar menu; story tests run in the default theme. React packages build with
   `libraryPack({ unbundle: true })` and call `describeClientBoundary()` in
   `src/client-boundary.test.ts`, run by a `<package>:node` Vitest project (environment `node`,
   excluded from the browser project).
4. New external dependencies go into the `catalog` in `pnpm-workspace.yaml` first (`catalogMode: strict`).
5. `vp install && vp check && vp run boundaries && vp test && vp run -r build`.

## Git

- Code, comments, docs and commit messages are written in English.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
  `type(scope): subject`, imperative, starting lowercase, no trailing period, header within
  72 characters, body separated by a blank line. Types: `feat`, `fix`, `docs`, `test`,
  `refactor`, `perf`, `style`, `build`, `ci`, `chore`, `revert`. Scopes: a package (`tokens`,
  `icons`, `core`, `headless`, `kit`, `audio`) or `docs`, `storybook`, `playground`, `config`,
  `repo`; no scope when a change spans several packages.
- Hooks live in `.vite-hooks/` (installed by `vp config` on `vp install`): `pre-commit` runs
  `vp staged` (`vp check --fix` on staged files), `commit-msg` runs
  [`scripts/check-commit-msg.ts`](scripts/check-commit-msg.ts).
- A change to a published package carries its changeset (`vp run changeset`) in the same commit.

## Versions

Node 24 LTS (`.nvmrc`), pnpm 12 (`packageManager`; older pnpm fails on `engines.pnpm`),
Vite+ 1.4 (bundles Vite 8, Vitest 5, Oxlint, Oxfmt, tsdown). `vite` in the catalog is aliased
to `@voidzero-dev/vite-plus-core` so Storybook and React Router use the same Vite as `vp`.
Run `vp toolchain` for the exact tool graph and `vp env doctor` when the environment looks wrong.
