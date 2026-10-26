import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

import { PORT, STATIC_DIR } from './site.ts';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  // React Router's single-fetch payloads, loaded on client navigations (`/docs/kit/button.data`).
  '.data': 'text/x-script',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Prerendered resource routes: React Router saves their responses as files without an
 * extension, so a host has to be told their types.
 */
const RESOURCE_TYPES: Readonly<Record<string, string>> = {
  'api/search': 'application/json; charset=utf-8',
};

/** The app without prerendered content: it renders the page of any path, the 404 page included. */
const SPA_FALLBACK = path.join(STATIC_DIR, '__spa-fallback.html');

/** The file a static host serves for a URL path: the file itself, or the `index.html` of a directory. */
function findFile(pathname: string): string | undefined {
  let requested: string;
  try {
    requested = path.join(STATIC_DIR, decodeURIComponent(pathname));
  } catch {
    // A malformed escape sequence.
    return undefined;
  }
  if (!requested.startsWith(`${STATIC_DIR}${path.sep}`)) {
    return undefined;
  }
  return [requested, path.join(requested, 'index.html')].find(
    (file) => statSync(file, { throwIfNoEntry: false })?.isFile() === true,
  );
}

function contentType(file: string): string {
  const resource = path.relative(STATIC_DIR, file).split(path.sep).join('/');
  return (
    RESOURCE_TYPES[resource] ?? CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream'
  );
}

/**
 * Serve the static docs build for the whole run, as a static host does: prerendered pages as
 * `<path>/index.html`, and the SPA fallback with status 404 for every path the build has no file
 * for. Playwright calls the returned teardown.
 */
export default async function serveDocs(): Promise<() => Promise<void>> {
  if (!existsSync(SPA_FALLBACK)) {
    throw new Error(`Missing ${SPA_FALLBACK}: run \`vp -C apps/docs run build\` first.`);
  }
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    const file = findFile(pathname);
    response.writeHead(file === undefined ? 404 : 200, {
      'content-type': contentType(file ?? SPA_FALLBACK),
    });
    createReadStream(file ?? SPA_FALLBACK).pipe(response);
  });
  await new Promise<void>((resolve, reject) => {
    // The port is taken, for one.
    server.once('error', reject);
    server.listen(PORT, resolve);
  });
  return async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error === undefined) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  };
}
