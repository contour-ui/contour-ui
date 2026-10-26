# @contour-ui/app-docs

Private. Documentation site built with [Fumadocs](https://fumadocs.dev) on React
Router (Vite), Tailwind v4 and the stock `neutral` theme. Fully static: SPA mode
with every docs page and the search index prerendered into `build/client/`.

```bash
vp -C apps/docs run dev     # dev server
vp -C apps/docs run build   # static build -> build/client
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
  `Callout`, `Cards`, `Card`, `Kbd`, the placeholders) and draws Markdown links, tables and code
  blocks with Kit's `Link`, `Table` and `CodeBlock`. `Callout` and `Card` keep the Fumadocs props
  and render Kit's `Alert` and `Card`; code tabs, headings and images are still Fumadocs'.
- Code blocks are highlighted at build time with Shiki's css-variables theme (`rehypeCodeOptions`
  in `vite.config.ts`): tokens are colored with `--shiki-*` variables, which Kit's `CodeBlock`
  maps to the syntax color tokens, so one theme follows both color themes. The `pre` mapping
  (`app/components/mdx-pre.tsx`) puts the `title="…"` meta in the header, adds a copy button
  unless the meta says `noCopy`, and turns off fumadocs-ui's own Shiki styles with the
  `not-fumadocs-codeblock` class.
- Page content is wrapped in `Prose` (`app/components/prose.tsx`): typography and spacing for MDX,
  in the `prose` cascade layer, between Preflight and contour-ui, so components inside keep their
  own styles. Nothing inside an element with the `docs-not-prose` class, such as `<Preview>`, is
  styled by Prose.
- The Fumadocs theme is mapped onto `@contour-ui/tokens` in `app/app.css` (colors and font
  families); next-themes sets both `.dark` and `data-theme`, so docs and tokens switch together.
