import { structure } from 'fumadocs-core/mdx-plugins/remark-structure';
import { createSearchAPI } from 'fumadocs-core/search/server';
import type { AdvancedIndex } from 'fumadocs-core/search/server';

/** A page of the site that the search indexes, with its content as Markdown. */
interface SearchPage {
  readonly url: string;
  readonly title: string;
  readonly description: string;
  /** As fumadocs-core's `createFromSource()` gives them: the root of the tree, the section… */
  readonly breadcrumbs: readonly string[];
  readonly markdown: string;
}

/** Pages of `pageTree` (`page-tree.ts`): "button" finds each of them, and a row of a table. */
const SEARCH_PAGES: readonly SearchPage[] = [
  {
    url: '/docs/kit',
    title: 'Kit',
    description: 'Styled general-purpose components.',
    breadcrumbs: ['Docs', 'Kit'],
    markdown: [
      '## Components',
      '',
      'Alert, Button, Card and Dialog, styled with the semantic tokens.',
    ].join('\n'),
  },
  {
    url: '/docs/kit/button',
    title: 'Button',
    description: 'A button that runs an action.',
    breadcrumbs: ['Docs', 'Kit', 'Components'],
    markdown: [
      '## Usage',
      '',
      'Import `Button` from `@contour-ui/kit` and give it a label.',
      '',
      '## Variants',
      '',
      'A button is `solid`, `outline` or `ghost`.',
      '',
      '## Props',
      '',
      '| Prop | Type | Default |',
      '| --- | --- | --- |',
      "| `variant` | `'solid' \\| 'outline' \\| 'ghost'` | `'solid'` |",
      "| `size` | `'sm' \\| 'md' \\| 'lg'` | `'md'` |",
      "| `type` | `'button' \\| 'submit' \\| 'reset'` | `'button'` |",
    ].join('\n'),
  },
  {
    url: '/docs/kit/dialog',
    title: 'Dialog',
    description: 'A window over the page.',
    breadcrumbs: ['Docs', 'Kit', 'Components'],
    markdown: [
      '## Closing',
      '',
      'The close button, Escape and a press outside close the dialog.',
    ].join('\n'),
  },
];

/** The search indexes of the pages, as `createFromSource()` builds them from MDX. */
function searchIndexes(): AdvancedIndex[] {
  return SEARCH_PAGES.map((page) => ({
    id: page.url,
    url: page.url,
    title: page.title,
    description: page.description,
    breadcrumbs: [...page.breadcrumbs],
    structuredData: structure(page.markdown),
  }));
}

/**
 * The static search index of the site, exported as a site's `staticGET()` serves it at
 * `/api/search`, in a blob: its URL is the `from` of the search, so the search dialog runs on a
 * real index without a server. Each call makes a new blob.
 */
export async function createSearchIndexUrl(): Promise<string> {
  const api = createSearchAPI('advanced', { language: 'english', indexes: searchIndexes() });
  const exported = await api.export();
  const blob = new Blob([JSON.stringify(exported)], { type: 'application/json' });
  return URL.createObjectURL(blob);
}
