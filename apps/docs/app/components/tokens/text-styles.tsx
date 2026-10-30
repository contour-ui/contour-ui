import { defaultTheme } from '@contour-ui/tokens';
import type { ReactElement } from 'react';

import { partsIn, partsOf } from './token-data.ts';
import type { TokenDoc } from './token-data.ts';
import { TokenDescription, TokenName } from './token-parts.tsx';

/** The three sets of text styles, by the kind of page they are made for. */
const TEXT_SETS: ReadonlyArray<{ readonly title: string; readonly styles: readonly string[] }> = [
  { title: 'Plugin UI', styles: ['heading', 'body', 'label', 'label-lg', 'value', 'caption'] },
  { title: 'Docs pages', styles: ['display', 'title', 'subtitle', 'prose', 'code'] },
  { title: 'Site pages', styles: ['hero', 'lead', 'nav'] },
];

/** The parts of a text style the page lists, in order, with their labels. */
const PROPERTIES = [
  ['fontSize', 'Size'],
  ['lineHeight', 'Line height'],
  ['fontWeight', 'Weight'],
  ['letterSpacing', 'Letter spacing'],
  ['fontFamily', 'Family'],
] as const;

/** `"IBM Plex Sans", system-ui, sans-serif` → `IBM Plex Sans`: the face the fonts load. */
const firstFamily = (stack: string): string =>
  stack.split(',')[0]?.replaceAll('"', '').trim() ?? '';

/**
 * A text style: its `font` shorthand with a copy button, a sample line set in it, its parts and
 * what it is for.
 */
function TextStyle({ font }: { readonly font: TokenDoc }): ReactElement {
  const parts = new Map(partsOf(font.token).map((doc) => [doc.part, doc]));
  const letterSpacing = parts.get('letterSpacing');
  return (
    <li className="docs-token-text">
      <TokenName name={font.name} />
      <p
        className="docs-token-text__sample"
        style={{
          font: `var(${font.name})`,
          letterSpacing: letterSpacing === undefined ? undefined : `var(${letterSpacing.name})`,
        }}
      >
        Gain −6.0 dB at 1.20 kHz
      </p>
      <dl className="docs-token-props">
        {PROPERTIES.map(([part, label]) => {
          const doc = parts.get(part);
          if (doc === undefined) {
            return null;
          }
          const { value } = doc.themes[defaultTheme];
          return (
            <div key={part}>
              <dt>{label}</dt>
              <dd>{part === 'fontFamily' ? firstFamily(value) : value}</dd>
            </div>
          );
        })}
      </dl>
      <TokenDescription doc={font} />
    </li>
  );
}

/**
 * Every text style (`--ct-text-<style>`, the `font` shorthand) in its set: dense plugin UI, docs
 * pages, site pages. A style of no set comes last, under "Other styles".
 */
export function TextStyles(): ReactElement {
  // `text.<style>`: the shorthand is the part `font` of the composite token.
  const fonts = new Map(
    partsIn('text.', 'font').map((doc): [string, TokenDoc] => [
      doc.token.slice('text.'.length),
      doc,
    ]),
  );
  const listed = new Set(TEXT_SETS.flatMap(({ styles }) => styles));
  const sets = [
    ...TEXT_SETS,
    { title: 'Other styles', styles: [...fonts.keys()].filter((style) => !listed.has(style)) },
  ];
  return (
    <div className="docs-token-groups contour-docs-not-prose">
      {sets.map(({ title, styles }) => {
        const docs = styles.flatMap((style) => fonts.get(style) ?? []);
        return docs.length === 0 ? null : (
          <div key={title} className="docs-token-group">
            <h3 className="docs-token-group__title">{title}</h3>
            <ul className="docs-token-list">
              {docs.map((font) => (
                <TextStyle key={font.name} font={font} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
