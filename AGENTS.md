# contour-ui — agent & contributor guide

Design system for audio-plugin UIs and general web UI with a layered
architecture. pnpm monorepo, single toolchain: **Vite+** (`vp`).

## Layers

All published packages live under `@contour-ui/` in `packages/`. Dependencies
point **down** the table only — never up, never sideways — with one exception:
`audio → kit`.

| Layer        | Package    | Purpose                                                                                         | May depend on (internal)             |
| ------------ | ---------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| 0 foundation | `tokens`   | DTCG design tokens → CSS vars / TS (Style Dictionary)                                           | —                                    |
| 0 foundation | `icons`    | SVG icons → React components / canvas commands (later)                                          | —                                    |
| 1 logic      | `core`     | framework/renderer-agnostic logic: `machine/`, `states/`, `interactions/`, `scales/`, `format/` | —                                    |
| 2 headless   | `headless` | unstyled React DOM components + hooks (Ark UI–like)                                             | `core`                               |
| 3 kit        | `kit`      | styled general-purpose components                                                               | `headless`, `tokens`, `icons`        |
| 3 kit        | `audio`    | styled audio components                                                                         | `headless`, `tokens`, `icons`, `kit` |

Rules:

- `core` has no React and no DOM (`lib` excludes `DOM`). The only exception is the
  `@contour-ui/core/react` subpath (`src/react/`), with `react` as an **optional** peer.
- `core` also runs on Hermes (the Soundor runtime, built without `Intl`): no `Intl`, no
  locale-dependent methods (`toLocale*`, `localeCompare`), no `eval` / `new Function`, no
  `SharedArrayBuffer`, `Atomics`, `Float16Array`. Lint enforces this for `packages/core/src/**`.
- Inside `core`, `states/` and `interactions/` never import each other; both may import `machine/`.
- `headless` must not depend on `tokens`, `icons`, `kit`, `audio`. Peers: `react`, `react-dom`.
- Kits (`kit`, `audio`) are styled with plain CSS + token CSS variables. **No Tailwind in packages.**
  Use semantic roles only (`--ct-color-*`, `--ct-space-*`, `--ct-text-*`…), never `--ct-base-*`.
- Kit CSS is one file per component (`src/<component>/<component>.css`) with plain rules, added to
  `src/styles.css` as `@import './<component>/<component>.css' layer(contour.kit);` (audio:
  `layer(contour.audio)`; its entry declares `@layer contour.kit, contour.audio;` so audio always
  ranks above kit). Unlayered app CSS overrides both.
- `react` / `react-dom` are never regular `dependencies`; in `headless` and kits they are required peers.

**Enforcement.** The table lives as data in [`scripts/layers.ts`](scripts/layers.ts) — edit it there only.

- Lint: the root `vite.config.ts` generates oxlint `no-restricted-imports` overrides from it
  (package imports, relative imports into sibling packages, React in core, `states/` ↔ `interactions/`, Tailwind).
- `vp run boundaries` ([`scripts/check-boundaries.ts`](scripts/check-boundaries.ts)) checks what lint
  cannot: declared dependencies in every `package.json` (even unused ones), React dependency kinds,
  CSS `@import`s, `exports` ↔ `publishConfig.exports` sync, and the Changesets `fixed` group.

### Naming

`@contour-ui/{layer}[-{target}]`. The default target is React DOM, so `headless`,
`kit`, `audio` are the React DOM packages. Reserved for the Soundor plugin UI
runtime adapters (**do not create yet**): `headless-soundor`, `kit-soundor`, `audio-soundor`.

Private workspaces: apps are `@contour-ui/app-*` (`apps/`), tooling is in `configs/`
(`@contour-ui/typescript-config`, `@contour-ui/vite-config`). Neither is ever published.

## Commands

Vite+ wraps everything; there is no Turborepo, ESLint or Prettier. `vp <cmd>` runs a
built-in; `vp run <name>` runs a `package.json` script or a `vite.config.ts` task.

| Command                                  | What it does                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `vp install`                             | install (pnpm 12, pinned via `packageManager`)                                                                                  |
| `vp check` / `vp check --fix`            | format (Oxfmt) + lint (Oxlint, type-aware) + type-check (tsgo)                                                                  |
| `vp run boundaries`                      | layer boundary check for `package.json` / CSS                                                                                   |
| `vp test`                                | all Vitest projects: node (core, tokens, icons), Chromium browser mode + stories-as-tests (UI packages)                         |
| `vp -C packages/kit test`                | one package's tests                                                                                                             |
| `vp run -r build`                        | build everything (`vp pack` + publint + attw for packages, apps)                                                                |
| `vp run storybook`                       | every package Storybook + the composition host on http://localhost:6100                                                         |
| `vp -C packages/kit run storybook`       | one package Storybook (tokens 6101, headless 6102, kit 6103, audio 6104)                                                        |
| `vp run build-storybook`                 | all Storybooks → one deployable folder `apps/storybook/storybook-static`                                                        |
| `vp run visual` / `vp run visual:update` | screenshot tests of the styled Storybooks in the pinned Playwright Linux image (Docker); `:update` rewrites changed screenshots |
| `vp -C apps/docs run dev` / `run build`  | Fumadocs site on http://localhost:5174 (static build → `apps/docs/build/client`)                                                |
| `vp -C apps/playground dev`              | Vite + React sandbox on http://localhost:5173                                                                                   |
| `vp run changeset`                       | record a changeset (all published packages are versioned together)                                                              |
| `vp run ready`                           | everything CI's first three jobs run                                                                                            |

Run checks **one task at a time** (`vp check`, then `vp test`, then `vp run -r build`);
narrow with `vp -C <dir>` or `--filter` for focused changes. First time on a machine:
`vp exec playwright install chromium` for browser-mode tests.

**Visual tests.** Every story of the `tokens`, `kit` and `audio` Storybooks is screenshotted in each
theme (Playwright, `apps/storybook/visual/`, screenshots in `visual/__snapshots__/`). They run
against the static build, in Docker locally and in the same image in CI, because rendering differs
between machines: never commit screenshots made outside that image. After an intended visual
change, run `vp run visual:update`, review the changed PNGs, and commit them. A story opts out with
`tags: ['!visual']`.

**Paused for now.** While the first kit components land, their look changes on almost every
commit, so CI runs the visual job only when the workflow is started by hand (`workflow_dispatch`)
and the committed screenshots are not kept in sync. Do not run `visual:update` per change: the
baselines are refreshed in one pass once the docs site runs on contour-ui's own components, and
then the job runs on every push again.

Lint and format config lives **only** in the root `vite.config.ts` (per-package
rules via `lint.overrides`). Package `vite.config.ts` files hold Vite, Vitest and
`pack` settings only. CI runs `vp check --deny-warnings`: warnings are errors.

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
- Contrast targets for the color roles are tests (`packages/tokens/src/contrast.test.ts`).

See [`packages/tokens/README.md`](packages/tokens/README.md).

## Docs

`apps/docs` (Fumadocs) documents what ships: a **Guide** (how the packages fit together,
installation, themes, styling with tokens) and one section per shipped package — **Kit**,
**Audio**, **Headless** — as root folders under `content/docs/`. When a component lands, add
`content/docs/<package>/<component>.mdx` (live example in `<Preview>`, anatomy, tokens) and list
it in that section's `meta.json`; register the live component in `app/components/mdx.tsx`.

## Adding a package

1. Add a row to `LAYERS` in `scripts/layers.ts` (name, layer, allowed deps, React policy) and the
   package name to the `fixed` group in `.changeset/config.json`.
2. Create `packages/<name>/` by copying the closest sibling: `package.json` (ESM only,
   `sideEffects`, `files: ["dist"]`, dev + publish `exports`, `publishConfig.access: public`,
   deps via `catalog:` / `workspace:*`), `tsconfig.json` (extends a `@contour-ui/typescript-config`
   preset), `vite.config.ts` (`libraryPack()`, tests), `README.md` (layer, purpose, allowed deps).
3. UI packages: add `.storybook/` (`storybookConfig()` from `@contour-ui/vite-config/storybook`),
   a fixed dev port in the `storybook` script, and an entry in `apps/storybook/refs.ts`. Styled
   packages wrap their preview in `withThemes()` (`@contour-ui/vite-config/storybook-preview`) for
   the Theme toolbar menu; story tests run in the default theme.
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
