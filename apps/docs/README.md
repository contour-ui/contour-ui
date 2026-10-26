# @contour-ui/app-docs

Private. Documentation site on React Router (Vite), with
[fumadocs-core](https://fumadocs.dev) and fumadocs-mdx for the content, the page tree, the search
index and the table of contents data, and a layout of its own built from contour-ui's Kit: no
Fumadocs UI, no Tailwind. Fully static: SPA mode with every docs page and the search index
prerendered into `build/client/`.

```bash
vp -C apps/docs run dev     # dev server on http://localhost:5174
vp -C apps/docs run build   # static build -> build/client
vp -C apps/docs run e2e     # build, then the end-to-end and axe tests
```

- Content lives in `content/docs/`:
  - `guide/` — how contour-ui works, for every package: what ships, installation, themes,
    styling with tokens;
  - `kit/`, `audio/`, `headless/` — one section per shipped package: an overview and a page per
    component, listed in the section's `meta.json`.

  Section folders are Fumadocs root folders (`"root": true` in `meta.json`): the sidebar shows one
  section at a time, with a switcher on top. `index.mdx` at the top is the entry page with links
  to the sections.

- Live examples import contour-ui components at the top of the page
  (`import { Button } from '@contour-ui/kit';`) and render them inside `<Preview>`, the frame for
  live examples; imports resolve to package sources (`@contour-ui/source` condition).
  `app/components/mdx.tsx` registers what every page can use without an import (`Preview`,
  `Callout`, `Cards`, `Card`, `Kbd`, the placeholders) and maps Markdown elements: headings link
  to themselves (`mdx-heading.tsx`), links, tables and code blocks are Kit's `Link`, `Table` and
  `CodeBlock`, and images stay plain `img`, which Prose fits to the column. `Callout` and `Card`
  keep the Fumadocs props and render Kit's `Alert` and `Card`.
- Code blocks are highlighted at build time with Shiki's css-variables theme (`rehypeCodeOptions`
  in `vite.config.ts`): tokens are colored with `--shiki-*` variables, which Kit's `CodeBlock`
  maps to the syntax color tokens, so one theme follows both color themes. The `pre` mapping
  (`app/components/mdx-pre.tsx`) puts the `title="…"` meta in the header and adds a copy button
  unless the meta says `noCopy`.
- The layout (`app/components/layout/`): `DocsShell` puts the navigation of the page's section in
  a sidebar from 48rem (the section switcher, a Kit `Popover`, and the page tree; it collapses,
  and the state is kept in `localStorage`) and, below 48rem, in a Kit `Drawer` that the menu
  button of a sticky header opens. `DocsPage` is `main#content`: `PageHeader` (the title and the
  description), the MDX in `Prose`, and `PageFooter` (the previous and next page of the section).
  `SiteLayout` is the layout of the home and 404 pages.
- The table of contents of a page is Kit's `Toc` over Fumadocs' `toc` (`app/components/toc-panel.tsx`):
  `TocPanel`, the "On this page" column from 80rem, and `TocPopover`, the bar with a popover below
  that. Both list the `h2` and `h3` headings and observe them below the sticky header and bar,
  whose heights the shell root sets as `--docs-header-height` and `--docs-toc-bar-height`.
  Headings keep the same room free with `scroll-margin-block-start`.
- Search (`app/components/search/`): `SearchProvider` (in `root.tsx`) renders the search dialog
  once and opens it with ⌘K / Ctrl K and from every `SearchTrigger`. The dialog is Kit's `Dialog`
  around a Kit `Listbox` whose `Input` is the search field. Results come from fumadocs-core's
  static search (`useStaticSearch`) on the index that `routes/search.ts` prerenders at
  `/api/search`; they are grouped by page, rendered from their parsed Markdown, with the query
  highlighted (`::highlight(fd-search)`).
- Theme: Kit's `ThemeProvider` keeps `data-theme` on `<html>`, stored as `contour-theme`, the
  system theme until the user picks one; `themeScript()` sets it before the first paint. The
  collapsed sidebar works the same way with `data-sidebar` on `<html>`.
- Styles: cascade layers `base, prose, contour, docs` (`app/app.css`). `app/base.css` styles the
  page itself and resets nothing, so Kit renders as in Storybook. `Prose`
  (`app/components/prose.tsx`) styles the MDX content in the `prose` layer, under contour-ui, so
  components inside keep their own styles; nothing inside an element with the `docs-not-prose`
  class, such as `<Preview>`, is styled by Prose.
- End-to-end tests (`e2e/`, Playwright): every page, the search, the table of contents, the phone
  menu, the theme, the navigation and the 404 page, plus axe on key pages in both themes,
  against the static build served as a static host serves it. `DOCS_URL` points them at another
  copy of the site, such as the dev server.
