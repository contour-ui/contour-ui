import { describe, expect, it } from 'vite-plus/test';

import { isExternalHref } from './href.ts';

describe('isExternalHref', () => {
  it('takes a URL with a scheme or a protocol-relative URL for another site', () => {
    const hrefs = [
      'https://fumadocs.dev/',
      'http://localhost:5173/docs',
      'mailto:hello@example.com',
      'tel:+15550100',
      'HTTPS://EXAMPLE.COM',
      'git+ssh://example.com/repo.git',
      '//cdn.example.com/script.js',
    ];

    expect(hrefs.filter((href) => !isExternalHref(href))).toStrictEqual([]);
  });

  it('keeps paths, relative links, fragments and queries on the site', () => {
    const hrefs = ['/docs/essentials', 'button', './button', '../guide', '#usage', '?tab=css', ''];

    expect(hrefs.filter((href) => isExternalHref(href))).toStrictEqual([]);
  });
});
