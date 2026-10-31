# @contour-ui/vite-config

Private, never published. Shared Vite / Vitest / pack helpers for the workspace.

- `contourSource()` — Vite plugin that prepends the `@contour-ui/source` export
  condition, so apps and tests consume package **sources** with HMR
  instead of `dist/`.
- `libraryPack({ entry, css, copy })` — `vp pack` settings shared by every published
  package (ESM only, `.d.ts`, publint + attw). A `.css` file in `entry` is bundled
  into `dist/<name>.css`: Lightning CSS inlines its `@import`s, `layer()` included
  (`styles.css` of `react` and `fumadocs`). Files in `css` are copied verbatim, so their
  `@import`s and `url()`s stay as written (`fonts.css` points at the font files next to it).
  Files and folders in `copy` are copied verbatim too: data exported as is, such as tokens
  `docs.json`, and the font files.
- `chromium()` — Vitest browser-mode settings (Playwright, headless Chromium).
- `VISUAL_TESTS`, `visualProjects(name)` — the screenshot tests of a package
  (`src/**/*.visual.test.tsx`): exclude the first from the package's browser project, spread the
  second into its `test.projects`. The project `<name>:visual` exists only while `CONTOUR_VISUAL`
  is set (`vp run visual`, `scripts/visual.ts`); its Chromium is the pinned Playwright image's,
  reached at `CONTOUR_VISUAL_SERVER` (`playwright run-server` in Docker), or launched in place
  inside that image (CI). Screenshots go to `__visual__/<test file>/<state>-<theme>.png`.
- `defineVisualStates(options)` (`@contour-ui/vite-config/visual`) — the screenshot tests of a
  styled package: a test per state and theme, drawn on a themed canvas, checked with axe in the
  default theme (`expectNoAxeViolations()`), then compared with its screenshot. Theme data comes
  from `@contour-ui/tokens`; this package does not depend on it.
