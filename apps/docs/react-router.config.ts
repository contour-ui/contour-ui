import { glob } from 'node:fs/promises';

import type { Config } from '@react-router/dev/config';
import { createGetUrl, getSlugs } from 'fumadocs-core/source';

const getUrl = createGetUrl('/docs');

/** Static site: SPA mode plus prerendered HTML for every docs page and the search index. */
export default {
  ssr: false,
  async prerender({ getStaticPaths }) {
    const paths = [...getStaticPaths()];
    for await (const entry of glob('**/*.mdx', { cwd: 'content/docs' })) {
      paths.push(getUrl(getSlugs(entry)));
    }
    return paths;
  },
} satisfies Config;
