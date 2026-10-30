# @contour-ui/fonts

**Layer 0 — foundation.** The font files of the contour-ui type tokens
(`--ct-base-font-family-*`): IBM Plex Sans and JetBrains Mono, each at every
`--ct-base-font-weight-*` (regular 400, medium 500, semibold 600), for both platforms:

- **Web:** `fonts.css` declares WOFF2 faces split by `unicode-range` (Latin, Latin Extended,
  Cyrillic, Cyrillic Extended, Greek, Vietnamese); browsers fetch only the subsets a page uses, so
  a page translated in the browser keeps its fonts.
- **Soundor:** static TTF files of the Latin subset, one per face. `registerFont()` takes TTF or
  OTF only, one file per face, with no variable axes.

The tokens package stays light: it names the families, and its consumers download no font files.

- **May depend on (internal):** nothing.

## Usage

```ts
import '@contour-ui/tokens/tokens.css';
import '@contour-ui/fonts/fonts.css'; // IBM Plex Sans + JetBrains Mono, 400/500/600
```

The TTF files, for runtimes that register fonts by file:

```ts
import { fontFaces } from '@contour-ui/fonts';
import plexSans400 from '@contour-ui/fonts/ttf/ibm-plex-sans-latin-400-normal.ttf';

fontFaces[0];
// { family: 'IBM Plex Sans', weight: 400, style: 'normal',
//   file: 'ttf/ibm-plex-sans-latin-400-normal.ttf' }
```

| Export                                        | What it is                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `fontFaces`                                   | every TTF face: `family`, `weight`, `style` and `file`, a subpath of the package |
| `./fonts.css`                                 | the `@font-face` rules of the WOFF2 files                                        |
| `./ttf/<id>-latin-<weight>-normal.ttf`        | static TTF, Latin subset                                                         |
| `./woff2/<id>-<subset>-<weight>-normal.woff2` | the web faces that `fonts.css` declares                                          |
| `./licenses/<id>.txt`                         | the license of each family                                                       |

## Sources

Both families come from [Fontsource](https://fontsource.org) 5.3.0, the Google Fonts builds, one
release for both platforms, so the web and Soundor draw the same outlines:

- WOFF2 and the license from the npm tarball of `@fontsource/<id>`, checked against its npm
  integrity;
- TTF from the Fontsource CDN at the same version, checked against SHA-256 sums.

The versions and checksums are pinned in [`scripts/sources.ts`](scripts/sources.ts).
`vp run --filter @contour-ui/fonts fonts` downloads them and writes `src/woff2/`, `src/ttf/`,
`src/licenses/`, `src/fonts.css` and `src/generated/faces.ts`; all of them are committed.
`vp test` checks, offline, the TTF checksums and that the files, `fonts.css` and `fontFaces`
agree, and loads every face in Chromium.

To update a family, change its `version` in `scripts/sources.ts`, run the script, and pin the
integrity and checksums it reports.

## Licenses

The package's own code is MIT (`LICENSE`). The fonts are licensed under the
[SIL Open Font License 1.1](https://openfontlicense.org); each license ships unmodified, with its
copyright notice, next to the files:

- IBM Plex Sans, © 2019 IBM Corp.: [`licenses/ibm-plex-sans.txt`](src/licenses/ibm-plex-sans.txt)
- JetBrains Mono, © 2020 The JetBrains Mono Project Authors:
  [`licenses/jetbrains-mono.txt`](src/licenses/jetbrains-mono.txt)
