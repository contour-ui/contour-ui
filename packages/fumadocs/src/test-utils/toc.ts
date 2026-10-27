import type { TableOfContents } from 'fumadocs-core/toc';

/**
 * The table of contents of a page as Fumadocs gives it: `h2`, `h3` and one `h4` ("Focus
 * order"), which the tables of contents of the layout leave out. `PageContent`
 * (`page-content.tsx`) renders the headings it links to.
 */
export const toc: TableOfContents = [
  { title: 'Usage', url: '#usage', depth: 2 },
  { title: 'Variants', url: '#variants', depth: 2 },
  { title: 'Sizes', url: '#sizes', depth: 3 },
  { title: 'With an icon', url: '#with-an-icon', depth: 3 },
  { title: 'Accessibility', url: '#accessibility', depth: 2 },
  { title: 'Keyboard', url: '#keyboard', depth: 3 },
  { title: 'Focus order', url: '#focus-order', depth: 4 },
  { title: 'Props', url: '#props', depth: 2 },
];
