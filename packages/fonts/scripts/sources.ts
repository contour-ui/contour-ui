/**
 * The pinned sources of the font files. Both families come from Fontsource (the Google Fonts
 * builds, SIL OFL 1.1), one release for the web and for Soundor:
 *
 * - WOFF2 from the npm tarball of `@fontsource/<id>`, every subset (`unicode-range`) of each
 *   weight, checked against the tarball's npm `integrity`;
 * - static TTF of the Latin subset from the Fontsource CDN at the same version, checked against
 *   its SHA-256. Soundor's `registerFont()` takes TTF or OTF only, one file per face.
 *
 * To update: change `version`, run `vp run --filter @contour-ui/fonts fonts`, and copy the
 * integrity and checksums it reports as wrong.
 */

export interface FontSource {
  /** Fontsource id: the npm package `@fontsource/<id>` and the prefix of every file. */
  readonly id: string;
  /** The CSS family name, as in `--ct-base-font-family-*`. */
  readonly family: string;
  readonly version: string;
  /** npm `dist.integrity` of the tarball. */
  readonly integrity: string;
  /** SHA-256 (hex) of the Latin TTF of each weight. */
  readonly ttf: Readonly<Record<FontWeight, string>>;
}

/** The weights of `--ct-base-font-weight-*`: regular, medium, semibold. */
export const WEIGHTS = [400, 500, 600] as const;

export type FontWeight = (typeof WEIGHTS)[number];

/** The subset of the TTF files. */
export const TTF_SUBSET = 'latin';

export const SOURCES: readonly FontSource[] = [
  {
    id: 'ibm-plex-sans',
    family: 'IBM Plex Sans',
    version: '5.3.0',
    integrity:
      'sha512-CbE4CbbEEZJX860XyUiRpsksXIQR8Rp2XDva2VO53NJox9tVNtusrysd2x5YkUEY3ErQ66W1IiiQL8/wihhw5w==',
    ttf: {
      400: '1fb42ec91b69b3545f15d7cfda148ae20bc2cb17aaed79eea9b7d3941cb71e4d',
      500: '296bbcdc58d7576041cac510175c24bc629d2c1c45ccd25034cd9903d97d4478',
      600: '6e0dcd02fd94e40c85974f328bb5a3521cfb81b59332559911fb08ff228bb176',
    },
  },
  {
    id: 'jetbrains-mono',
    family: 'JetBrains Mono',
    version: '5.3.0',
    integrity:
      'sha512-fqDfB5I9f1p1TV486aUgB9t8zP84P0O1FtQR5Ol9vjwPy+S+EIGlVYm1cvj2W5shcZMTg2nZFdVMoH5wFu8a1A==',
    ttf: {
      400: '473c93ad62d89abd8431c8f5d744c83fe2e3f87d05b2f80c06355f240058d813',
      500: '02ec8096c82f8480b76569379faa3d6420039ccec1c19839ffd3c6401b37a929',
      600: 'ced104af92f52d524d1fff3db1f7d45fc85b7bce044993c4dcf878eac2d6e95a',
    },
  },
];

export const tarballUrl = ({ id, version }: FontSource): string =>
  `https://registry.npmjs.org/@fontsource/${id}/-/${id}-${version}.tgz`;

export const ttfName = ({ id }: FontSource, weight: FontWeight): string =>
  `${id}-${TTF_SUBSET}-${weight}-normal.ttf`;

export const ttfUrl = (source: FontSource, weight: FontWeight): string =>
  `https://cdn.jsdelivr.net/fontsource/fonts/${source.id}@${source.version}/${TTF_SUBSET}-${weight}-normal.ttf`;
