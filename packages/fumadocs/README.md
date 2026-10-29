# @contour-ui/fumadocs

**Layer 4 — docs.** A documentation layout for sites on [Fumadocs](https://fumadocs.dev)'
`fumadocs-core`, built from `@contour-ui/kit`: install it **in place of** `fumadocs-ui`, not on
top of it. The sidebar, the search, the table of contents, the page parts and the MDX components
come from contour-ui; `fumadocs-core` gives the data (page tree, search index, table of contents),
and the app's framework adapter (`fumadocs-core/framework`) the links and the navigation.

- **May depend on (internal):** `@contour-ui/kit`, `@contour-ui/headless`, `@contour-ui/tokens`,
  `@contour-ui/icons`.
- **Peers:** `react`, `react-dom`, `fumadocs-core`; `@types/mdx` (optional, for TypeScript).
- **Entry points:** `@contour-ui/fumadocs` (provider and layouts), `@contour-ui/fumadocs/mdx` (MDX
  components), `@contour-ui/fumadocs/styles.css`.
- **Storybook:** port 6105.

## Usage

The root of the app, inside the adapter of its framework (React Router here):

```tsx
import { DocsProvider, docsScript } from '@contour-ui/fumadocs';
import type { DocsSite } from '@contour-ui/fumadocs';
import { githubIcon } from '@contour-ui/icons';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';

import '@contour-ui/tokens/tokens.css';
import '@contour-ui/tokens/fonts.css';
import '@contour-ui/fumadocs/styles.css'; // before Kit's: it sets the cascade layer order
import '@contour-ui/kit/styles.css';

const site: DocsSite = {
  name: 'My docs',
  nav: [{ label: 'Docs', href: '/docs' }],
  links: [{ label: 'GitHub', href: 'https://github.com/me/my-docs', icon: githubIcon }],
};

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: docsScript() }} />
      </head>
      <body>
        <ReactRouterProvider>
          <DocsProvider site={site}>{children}</DocsProvider>
        </ReactRouterProvider>
      </body>
    </html>
  );
}
```

A docs page, and any other page:

```tsx
import { DocsLayout, DocsPage, HomeLayout } from '@contour-ui/fumadocs';
import { getMdxComponents, Prose } from '@contour-ui/fumadocs/mdx';

<DocsLayout tree={source.getPageTree()}>
  <DocsPage title={page.data.title} description={page.data.description} toc={page.data.toc}>
    <Prose>
      <Mdx components={getMdxComponents()} />
    </Prose>
  </DocsPage>
</DocsLayout>;

<HomeLayout>…</HomeLayout>;
```

- `DocsProvider`: `site` (`name`; `url`, where the brand leads, `/` by default; `nav`, text links in
  the header of `HomeLayout`; `links`, icon buttons such as GitHub), `search` (`{ from }`, the URL
  of fumadocs-core's static index, `/api/search` by default; `false` for none), `theme` (Kit
  `ThemeProvider` options), `sidebarStorageKey`. Give `docsScript()` the same `theme` and
  `sidebarStorageKey`.
- The search downloads the index that `createFromSource(source).staticGET()` of
  `fumadocs-core/search/server` serves, prerendered on a static site.
- A layout of your own: `SearchTrigger`, `ThemeToggle` and `SkipLink` (render it first, and give
  the main content `id="content"` and `tabIndex={-1}`).

## Next.js (App Router)

The package works with React Server Components. Its parts that need the browser are client
modules (`'use client'`, kept per file); `docsScript()`, `getMdxComponents()`, `HomeLayout` and
`Prose` run on the server. Wrap the app in fumadocs-core's `NextProvider`:

```tsx title="app/layout.tsx"
import { NextProvider } from 'fumadocs-core/framework/next';

<html lang="en" suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: docsScript() }} />
  </head>
  <body>
    <NextProvider>
      <DocsProvider site={site}>{children}</DocsProvider>
    </NextProvider>
  </body>
</html>;
```

```tsx title="app/docs/layout.tsx and app/docs/[[...slug]]/page.tsx"
export default function Layout({ children }: { children: ReactNode }) {
  return <DocsLayout tree={source.getPageTree()}>{children}</DocsLayout>;
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const Mdx = page.data.body;
  return (
    <DocsPage title={page.data.title} description={page.data.description} toc={page.data.toc}>
      <Prose>
        <Mdx components={getMdxComponents()} />
      </Prose>
    </DocsPage>
  );
}
```

```ts title="app/api/search/route.ts"
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;
export const { staticGET: GET } = createFromSource(source);
```

- Props go from server components to client components: pass data, React nodes and components,
  never functions.
- Kit and headless carry `'use client'` per module too: a server component, MDX included, imports
  `@contour-ui/kit` directly and renders `Card.Root` or `Button`. Kit's `themeScript` also comes
  without React from `@contour-ui/kit/theme-script`.
- A server component cannot read inside an export of a client module of your own (an object
  exported from a `'use client'` file is a reference there). Kit's namespaces are server modules,
  so `Card.Root` works; write your own parts as a namespace barrel without the directive, or export
  them by name.
- `output: 'export'` works: the search index is prerendered at `/api/search`.

## MDX

- `getMdxComponents(overrides?)` returns the components of a page: headings that link to
  themselves; links as Kit's `Link` (a page of the site through `fumadocs-core/framework`'s `Link`,
  a `#fragment` as is, another site in a new tab); tables as Kit's `Table`; code blocks as Kit's
  `CodeBlock`, from the props of Fumadocs' `rehypeCode` (`title="…"`, `noCopy`, `lineNumbers[=N]`);
  `Callout`, `Card`, `Cards`, `Kbd` and `Preview`. Your `overrides` win.
- `Prose`: typography and spacing for MDX content; an element with the `contour-docs-not-prose`
  class opts its subtree out. `Preview`: the frame of live examples.
- `Callout`, `Card`, `Cards`: Kit's `Alert` and `Card` with the MDX props of Fumadocs.
- TypeScript users install `@types/mdx` (an optional peer).
- Highlight code with Shiki's css-variables theme, which Kit's `CodeBlock` maps to the syntax
  tokens: `rehypeCodeOptions: { themes: { tokens: createCssVariablesTheme() }, defaultColor:
  'tokens', tabindex: false }` in the options of fumadocs-mdx (see the docs site's
  `vite.config.ts`).
- Fumadocs' code block tabs (the `tab` meta, `npm` blocks) are not supported yet: they render
  components the map does not hold.

## Styles

- Load `styles.css` after `@contour-ui/tokens/tokens.css` and **before** Kit's and Audio's styles:
  it starts with the cascade layer order `contour.fumadocs-base, contour.fumadocs-prose,
  contour.kit, contour.audio, contour.fumadocs`. The page base (no reset) and Prose rank below the
  components, so components inside the content keep their styles; the layout ranks above them.
  Every layer is inside `contour`, so your unlayered CSS overrides them all.
- Public class names are `contour-docs-<part>` (the layout root is `contour-docs-layout`). The
  layout root sets `--contour-docs-sidebar-width`, `--contour-docs-article-width`,
  `--contour-docs-toc-width`, `--contour-docs-page-inset`, and the heights of the sticky bars
  `--contour-docs-header-height` and `--contour-docs-toc-bar-height` (`0px` where a bar is gone).
- A collapsed sidebar is `<html data-contour-docs-sidebar="collapsed">`, set by `docsScript()`
  before the first paint and stored under `contour-docs-sidebar`; the theme is Kit's `data-theme`,
  stored under `contour-theme`.
