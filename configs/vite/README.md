# @contour-ui/vite-config

Private, never published. Shared Vite / Vitest / pack helpers for the workspace.

- `contourSource()` — Vite plugin that prepends the `@contour-ui/source` export
  condition, so apps, Storybook and tests consume package **sources** with HMR
  instead of `dist/`.
- `libraryPack({ entry, css, copy })` — `vp pack` settings shared by every published
  package (ESM only, `.d.ts`, publint + attw). A `.css` file in `entry` is bundled
  into `dist/<name>.css`: Lightning CSS inlines its `@import`s, `layer()` included
  (`styles.css` of `react` and `fumadocs`). Files in `css` are copied verbatim, so their
  `@import`s stay external (tokens `fonts.css` keeps importing Fontsource). Files in `copy`
  are copied verbatim too: data exported as is, such as tokens `docs.json`.
- `chromium()` — Vitest browser-mode settings (Playwright, headless Chromium).
- `storybookConfig()` (`@contour-ui/vite-config/storybook`) — shared package
  `.storybook/main.ts`: React + Vite, docs, a11y, Vitest addon.
- `withThemes(preview, { themes, defaultTheme, attribute, canvas })`
  (`@contour-ui/vite-config/storybook-preview`) — wraps a styled package's `.storybook/preview.ts`:
  a Theme toolbar menu (each theme, or all side by side) and a decorator that draws the story on a
  themed canvas. In side-by-side mode only the default theme renders inside `#storybook-root`, so
  play functions and a11y checks see one copy; the others render beside it. Theme data comes from
  `@contour-ui/tokens`; this package does not depend on it.
