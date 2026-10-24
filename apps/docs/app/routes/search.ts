import { createFromSource } from 'fumadocs-core/search/server';

import { source } from '../lib/source.ts';

const server = createFromSource(source, { language: 'english' });

export function loader(): Promise<Response> {
  return server.staticGET();
}
