import { staticClient } from 'fumadocs-core/search/client/orama-static';
import { describe, expect, it } from 'vite-plus/test';

import { createSearchIndexUrl } from './search-index.ts';

describe('createSearchIndexUrl', () => {
  it('serves a static index that the static client of fumadocs-core searches', async () => {
    const from = await createSearchIndexUrl();
    const results = await staticClient({ from }).search('button');

    const pages = results.filter((result) => result.type === 'page').map((result) => result.url);
    expect(pages).toStrictEqual(
      expect.arrayContaining(['/docs/kit', '/docs/kit/button', '/docs/kit/dialog']),
    );
    expect(results).toContainEqual(
      expect.objectContaining({ type: 'text', url: '/docs/kit/button#usage' }),
    );
    // A row of the table of props, with its header row: the search client groups the rows of a
    // table by `table`.
    const row = results.find((result) => result.url === '/docs/kit/button#props');
    expect(row?.table).toBeTypeOf('string');
    expect(row?.content).toContain('| Prop');
  });
});
