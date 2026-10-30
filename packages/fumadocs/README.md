# @contour-ui/fumadocs

**Layer 4 — docs.** A documentation layout for sites on [Fumadocs](https://fumadocs.dev)'
`fumadocs-core`, built from `@contour-ui/react`: install it **in place of** `fumadocs-ui`, not on
top of it. The sidebar, the search, the table of contents, the page parts and the MDX components
come from contour-ui; `fumadocs-core` gives the data (page tree, search index, table of contents),
and the app's framework adapter (`fumadocs-core/framework`) the links and the navigation.

- **May depend on (internal):** `@contour-ui/react`, `@contour-ui/headless-react`, `@contour-ui/tokens`,
  `@contour-ui/icons`.
- **Peers:** `react`, `react-dom`, `fumadocs-core`; `@types/mdx` (optional, for TypeScript).
- **Entry points:** `@contour-ui/fumadocs` (provider and layouts), `@contour-ui/fumadocs/mdx` (MDX
  components), `@contour-ui/fumadocs/styles.css`.
- **Screenshot tests:** each state of the layouts and MDX components as a page of a docs site of
  fixtures, in both themes (`vp run visual`).

## Usage

The root of the app, inside the adapter of its framework (React Router here):

```tsx
import { DocsProvider, docsScript } from '@contour-ui/fumadocs';
import type { DocsSite } from '@contour-ui/fumadocs';
import { githubIcon } from '@contour-ui/icons';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';

import '@contour-ui/tokens/tokens.css';
import '@contour-ui/tokens/fonts.css';
import '@contour-ui/fumadocs/styles.css'; // before the styled components: it sets the layer order
import '@contour-ui/react/styles.css';

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

<HomeLayout search={false}>…</HomeLayout>;
```

- `DocsProvider`: `site` (`name`; `url`, where the brand leads, `/` by default; `nav`, text links in
  the header of `HomeLayout`; `links`, icon buttons such as GitHub), `search` (`{ from }`, the URL
  of fumadocs-core's static index, `/api/search` by default; `false` for none), `theme` (the
  options of the `ThemeProvider` of `@contour-ui/react`), `themeToggle` (`{ mode }`, below),
  `sidebarStorageKey`. Give `docsScript()` the same `theme` and `sidebarStorageKey`.
- `HomeLayout`: `search` (`true` by default; `false` leaves the search button out of its header,
  and the shortcut, ⌘K or Ctrl K, still opens the search). Its header, without a divider, lays its
  content out in the column of the page, `--contour-docs-home-width` wide: the brand at the start;
  the `nav` links (the navigation "Main"), the search, the `links` and the theme toggle at the end.
  It is `4.5rem` high from 48rem and `3rem` on phones, where the `nav` links scroll sideways in
  their own box if the header runs out of room.
- The theme toggle of the layouts: `themeToggle: { mode: 'light-dark' }`, the default, a button
  between the light and the dark theme; `'light-dark-system'`, three choices on the styled
  SegmentGroup, with the theme of the operating system. The server cannot know the stored choice,
  so the three-way picker checks none until the page has hydrated.
- Folders of the page tree open and close: the name links to the index page, a button after it
  shows the pages. A folder opens when it holds the page (also as the reader goes to one of its
  pages) and with `"defaultOpen": true` in its `meta.json`; `"collapsible": false` keeps it open.
- The search downloads the index that `createFromSource(source).staticGET()` of
  `fumadocs-core/search/server` serves, prerendered on a static site.
- A layout of your own: `SearchTrigger`, `ThemeToggle` (`mode`, or the provider's) and `SkipLink`
  (render it first, and give the main content `id="content"` and `tabIndex={-1}`).

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
- `@contour-ui/react` and `@contour-ui/headless-react` carry `'use client'` per module too: a
  server component, MDX included, imports `@contour-ui/react` directly and renders `Card.Root` or
  `Button`. Its `themeScript` also comes without React from `@contour-ui/react/theme-script`.
- A server component cannot read inside an export of a client module of your own (an object
  exported from a `'use client'` file is a reference there). The namespaces of `@contour-ui/react`
  are server modules, so `Card.Root` works; write your own parts as a namespace barrel without the
  directive, or export them by name.
- `output: 'export'` works: the search index is prerendered at `/api/search`.

## MDX

- `getMdxComponents(overrides?)` returns the components of a page: headings that link to
  themselves; links as the styled `Link` (a page of the site through `fumadocs-core/framework`'s
  `Link`, a `#fragment` as is, another site in a new tab); tables as the styled `Table`; code
  blocks as the styled `CodeBlock`, from the props of Fumadocs' `rehypeCode` (`title="…"`,
  `noCopy`, `lineNumbers[=N]`);
  `Callout`, `Card`, `Cards`, `Kbd`, `Preview`, `Tabs` and `Tab`; and what Fumadocs' remark
  plugins write into a page: `CodeBlockTabs` and its parts, and the parts of `Tabs`
  (`TabsList`, `TabsTrigger`, `TabsContent`). Your `overrides` win.
- Code block tabs: consecutive code blocks with a `tab` meta (`remarkCodeTab`), and ` ```npm ` or
  ` ```package-install ` blocks, the command of each package manager (`remarkNpm`); `fumadocs-mdx`
  runs both by default. One frame, the triggers where the header of a code block is, the copy
  button of the code shown at the end of their row.
- `Tabs` takes the props of Fumadocs' `Tabs`: `items`, `defaultIndex`, `defaultValue`, `label`,
  `groupId`, `persist`, `updateAnchor`; a `Tab` without `value` takes the item of its place. Tabs
  of one `groupId` (and `tab-group`) select the same tab, remembered in `sessionStorage`, or in
  `localStorage` with `persist`, under the group id; the address (`#id` of a `Tab`, or an element
  inside one) opens a tab, and `updateAnchor` writes the `id` of the selected one. Values are the
  items as written. `remarkNpmOptions: { persist: { id } }` makes every install command one group.
- `Prose`: typography and spacing for MDX content; an element with the `contour-docs-not-prose`
  class opts its subtree out. `Preview`: the frame of live examples.
- `Callout`, `Card`, `Cards`: the styled `Alert` and `Card` with the MDX props of Fumadocs.
- TypeScript users install `@types/mdx` (an optional peer).
- Highlight code with Shiki's css-variables theme, which the styled `CodeBlock` maps to the syntax
  tokens: `rehypeCodeOptions: { themes: { tokens: createCssVariablesTheme() }, defaultColor:
  'tokens', tabindex: false }` in the options of fumadocs-mdx (see the docs site's
  `vite.config.ts`).

## Styles

- Load `styles.css` after `@contour-ui/tokens/tokens.css` and **before**
  `@contour-ui/react/styles.css`: it starts with the cascade layer order `contour.fumadocs-base,
  contour.fumadocs-prose, contour.components, contour.fumadocs`. The page base (no reset) and
  Prose rank below the components, so components inside the content keep their styles; the layout
  ranks above them. Every layer is inside `contour`, so your unlayered CSS overrides them all.
- Public class names are `contour-docs-<part>` (the layout root is `contour-docs-layout`). The
  layout root sets `--contour-docs-sidebar-width`, `--contour-docs-article-width`,
  `--contour-docs-toc-width`, `--contour-docs-page-inset`, and the heights of the sticky bars
  `--contour-docs-header-height` and `--contour-docs-toc-bar-height` (`0px` where a bar is gone).
- The root of `HomeLayout` (`contour-docs-home-layout`) sets `--contour-docs-home-width` (`80rem`),
  the width of the column of its pages, with `--contour-docs-page-inset` and
  `--contour-docs-header-height`. A column of a page lines up with the header when it reads them:
  `box-sizing: border-box`, `margin-inline: auto`, `padding-inline: var(--contour-docs-page-inset)`
  and `max-inline-size: calc(var(--contour-docs-home-width) + 2 * var(--contour-docs-page-inset))`.
- A collapsed sidebar is `<html data-contour-docs-sidebar="collapsed">`, set by `docsScript()`
  before the first paint and stored under `contour-docs-sidebar`; the theme is the `data-theme` of
  `ThemeProvider`, stored under `contour-theme`.
