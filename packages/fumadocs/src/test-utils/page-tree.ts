import type { Root } from 'fumadocs-core/page-tree';

/**
 * The page tree of a small docs site, as fumadocs-core's `loader()` builds it with
 * `baseUrl: '/docs'`: the index page `/docs`, then two sections, root folders (`"root": true` in
 * their `meta.json`) with a description, their index page listed first.
 *
 * - Guide: four pages, a separator ("Styling") and two more pages.
 * - Kit: a separator ("Components"), two pages, the folder Forms with an index page of its own
 *   and two pages, then a separator ("Resources") and an external link.
 */
export const pageTree: Root = {
  $id: 'root',
  type: 'root',
  name: 'Docs',
  children: [
    { $id: 'index.mdx', type: 'page', name: 'Introduction', url: '/docs' },
    {
      $id: 'guide',
      type: 'folder',
      name: 'Guide',
      description: 'How it works and how to set it up',
      root: true,
      children: [
        { $id: 'guide/index.mdx', type: 'page', name: 'Guide', url: '/docs/guide' },
        {
          $id: 'guide/installation.mdx',
          type: 'page',
          name: 'Installation',
          url: '/docs/guide/installation',
        },
        { $id: 'guide/themes.mdx', type: 'page', name: 'Themes', url: '/docs/guide/themes' },
        { $id: '_0', type: 'separator', name: 'Styling' },
        { $id: 'guide/tokens.mdx', type: 'page', name: 'Tokens', url: '/docs/guide/tokens' },
        { $id: 'guide/css.mdx', type: 'page', name: 'Plain CSS', url: '/docs/guide/css' },
      ],
    },
    {
      $id: 'kit',
      type: 'folder',
      name: 'Kit',
      description: 'Styled general-purpose components',
      root: true,
      children: [
        { $id: 'kit/index.mdx', type: 'page', name: 'Kit', url: '/docs/kit' },
        { $id: '_1', type: 'separator', name: 'Components' },
        { $id: 'kit/button.mdx', type: 'page', name: 'Button', url: '/docs/kit/button' },
        { $id: 'kit/dialog.mdx', type: 'page', name: 'Dialog', url: '/docs/kit/dialog' },
        {
          $id: 'kit/forms',
          type: 'folder',
          name: 'Forms',
          index: {
            $id: 'kit/forms/index.mdx',
            type: 'page',
            name: 'Forms',
            url: '/docs/kit/forms',
          },
          children: [
            {
              $id: 'kit/forms/checkbox.mdx',
              type: 'page',
              name: 'Checkbox',
              url: '/docs/kit/forms/checkbox',
            },
            {
              $id: 'kit/forms/select.mdx',
              type: 'page',
              name: 'Select',
              url: '/docs/kit/forms/select',
            },
          ],
        },
        { $id: '_2', type: 'separator', name: 'Resources' },
        {
          $id: '_3',
          type: 'page',
          name: 'Changelog',
          url: 'https://github.com/contour-ui/contour-ui/releases',
        },
      ],
    },
  ],
};
