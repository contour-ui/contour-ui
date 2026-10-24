/** Placeholder icon shape. React components and canvas commands are generated from SVG later. */
export interface IconDefinition {
  readonly name: string;
  readonly viewBox: string;
  readonly path: string;
}

export const placeholderIcon: IconDefinition = {
  name: 'placeholder',
  viewBox: '0 0 16 16',
  path: 'M2 2h12v12H2z',
};
