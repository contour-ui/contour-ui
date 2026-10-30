/** One static font face: a family at a weight, in one TTF file. */
export interface FontFaceData {
  /** The CSS family name, as in `--ct-base-font-family-*`: `'IBM Plex Sans'`. */
  readonly family: string;
  /** The CSS weight, as in `--ct-base-font-weight-*`: `400`. */
  readonly weight: number;
  readonly style: 'normal';
  /** The file as a subpath of the package: `ttf/ibm-plex-sans-latin-400-normal.ttf`. */
  readonly file: `ttf/${string}.ttf`;
}
