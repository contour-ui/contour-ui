# @contour-ui/app-docs

Private. The contour-ui documentation site on React Router (Vite), with fumadocs-core and
fumadocs-mdx for the content, the page tree, the search index and the table of contents data, and
the layout of [`@contour-ui/fumadocs`](../../packages/fumadocs/README.md) — this site is its first
consumer. Fully static: SPA mode with every docs page and the search index prerendered into
`build/client/`.

```bash
vp -C apps/docs run dev     # dev server on http://localhost:5174
vp -C apps/docs run build   # static build -> build/client
vp -C apps/docs run e2e     # build, then the end-to-end and axe tests
```

- Content lives in `content/docs/`:
  - `guide/` — how contour-ui works, for every package: what ships, installation, themes,
    styling with tokens;
  - `kit/`, `audio/`, `headless/`, `fumadocs/` — one section per shipped package: an overview and
    a page per component or topic, listed in the section's `meta.json`.

  Section folders are Fumadocs root folders (`"root": true` in `meta.json`): the sidebar shows one
  section at a time, with a switcher on top. `index.mdx` at the top is the entry page with links
  to the sections.

- `app/root.tsx` wraps the app in fumadocs-core's `ReactRouterProvider` and in `DocsProvider`
  (the site's name and its GitHub link), renders `docsScript()` in `<head>`, and loads the styles:
  tokens, fonts, `@contour-ui/fumadocs/styles.css` (before Kit's: it sets the cascade layers),
  Kit, Audio, then the app's own `app/app.css`, unlayered.
- `app/routes/docs.tsx` loads a page (a `clientLoader` too, so that a page that does not exist
  shows the 404 page on a static host) and renders it in `DocsLayout` and `DocsPage`, the MDX in
  `Prose` with `getMdxComponents(mdxPlaceholderComponents)`; `home.tsx` and `not-found.tsx` use
  `HomeLayout`; `routes/search.ts` prerenders the search index at `/api/search`.
- The brand in the headers and the sidebar is the Contour logo (`app/components/contour-logo.tsx`,
  in `currentColor`; the mark alone below 30rem, where the header also holds the site's links).
  The favicons in `public/` come from the same logo package.
- The home page (`app/components/home/`) is built from Kit and the tokens only: the hero, a
  sequencer whose tracks are the parts of contour-ui and whose clips are their components (Kit's
  `Placeholder` for those that do not ship yet), the docs index and the footer.
- Live examples import contour-ui components at the top of the page
  (`import { Button } from '@contour-ui/react';`) and render them inside `<Preview>`, the frame for
  live examples; imports resolve to package sources (`@contour-ui/source` condition), so the dev
  server shows changes to the packages, the layout package included, at once.
- Code blocks are highlighted at build time with Shiki's css-variables theme (`rehypeCodeOptions`
  in `vite.config.ts`): tokens are colored with `--shiki-*` variables, which Kit's `CodeBlock`
  maps to the syntax color tokens, so one theme follows both color themes.
- End-to-end tests (`e2e/`, Playwright): every page, the search, the table of contents, the phone
  menu, the theme, the navigation and the 404 page, plus axe on key pages in both themes, against
  the static build served as a static host serves it. `DOCS_URL` points them at another copy of
  the site, such as the dev server.
