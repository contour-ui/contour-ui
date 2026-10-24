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

- Live contour-ui components are exposed to MDX in `app/components/mdx.tsx` (plus `<Preview>`, the
  frame for live examples) and consumed from package sources (`@contour-ui/source` condition).
- The Fumadocs theme is mapped onto `@contour-ui/tokens` in `app/app.css` (colors and font
  families); next-themes sets both `.dark` and `data-theme`, so docs and tokens switch together.
