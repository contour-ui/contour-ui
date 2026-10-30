/**
 * Download the pinned font releases (`scripts/sources.ts`), check them, and write the committed
 * files: `src/woff2/`, `src/ttf/`, `src/licenses/`, `src/fonts.css` and `src/generated/faces.ts`.
 *
 *   vp run --filter @contour-ui/fonts fonts
 *
 * Needs the network. A file whose checksum differs from the pinned one stops the run before
 * anything is written.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import {
  CSS_FILE,
  FACES_FILE,
  LICENSES_DIR,
  PACKAGE_DIR,
  TTF_DIR,
  WOFF2_DIR,
  facesModule,
  fontsCss,
  licenseName,
  parseWebFaces,
} from './build-fonts.ts';
import type { WebFace } from './build-fonts.ts';
import { SOURCES, WEIGHTS, tarballUrl, ttfName, ttfUrl } from './sources.ts';
import type { FontSource } from './sources.ts';

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function check(url: string, actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`${url}: checksum ${actual}, pinned ${expected}`);
  }
}

/** The regular files of a tar archive (ustar), by path. */
function untar(archive: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const text = (start: number, end: number): string =>
    archive.toString('utf8', start, end).replace(/\0.*$/su, '');
  let offset = 0;
  while (offset + 512 <= archive.length && archive[offset] !== 0) {
    const size = Number.parseInt(text(offset + 124, offset + 136).trim() || '0', 8);
    const type = text(offset + 156, offset + 157);
    const prefix = text(offset + 345, offset + 500);
    const name = text(offset, offset + 100);
    if (type === '0' || type === '') {
      const body = archive.subarray(offset + 512, offset + 512 + size);
      files.set(prefix === '' ? name : `${prefix}/${name}`, body);
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

function entry(files: ReadonlyMap<string, Buffer>, name: string): Buffer {
  const file = files.get(`package/${name}`);
  if (file === undefined) {
    throw new Error(`the tarball has no ${name}`);
  }
  return file;
}

/** The files of one family, by path, and its web faces in the order of its CSS. */
async function fetchFamily(source: FontSource): Promise<[Map<string, Buffer>, WebFace[]]> {
  const url = tarballUrl(source);
  const [tarball, ttfFiles] = await Promise.all([
    download(url),
    Promise.all(WEIGHTS.map((weight) => download(ttfUrl(source, weight)))),
  ]);
  check(url, `sha512-${createHash('sha512').update(tarball).digest('base64')}`, source.integrity);
  const files = untar(gunzipSync(tarball));

  const outputs = new Map([
    [path.join(LICENSES_DIR, licenseName(source)), entry(files, 'LICENSE')],
  ]);
  const faces = WEIGHTS.flatMap((weight, index) => {
    const ttf = ttfFiles[index] ?? Buffer.alloc(0);
    check(
      ttfUrl(source, weight),
      createHash('sha256').update(ttf).digest('hex'),
      source.ttf[weight],
    );
    outputs.set(path.join(TTF_DIR, ttfName(source, weight)), ttf);

    const weightFaces = parseWebFaces(source, weight, entry(files, `${weight}.css`).toString());
    for (const face of weightFaces) {
      const name = `${face.name}.woff2`;
      outputs.set(path.join(WOFF2_DIR, name), entry(files, `files/${name}`));
    }
    return weightFaces;
  });
  return [outputs, faces];
}

const families = await Promise.all(SOURCES.map((source) => fetchFamily(source)));
const outputs = new Map<string, Buffer | string>(families.flatMap(([files]) => [...files]));
const faces = families.flatMap(([, familyFaces]) => familyFaces);

outputs.set(CSS_FILE, fontsCss(faces));
outputs.set(FACES_FILE, facesModule());

for (const dir of [WOFF2_DIR, TTF_DIR, LICENSES_DIR]) {
  rmSync(dir, { recursive: true, force: true });
}
for (const [file, content] of outputs) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

console.log(
  `wrote ${outputs.size} files under ${path.relative(PACKAGE_DIR, path.dirname(CSS_FILE))}`,
);
