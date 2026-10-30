import type { CSSProperties, ReactElement } from 'react';

import { tokensIn } from './token-data.ts';
import type { TokenDoc } from './token-data.ts';
import { TokenTable, VALUE_COLUMN } from './token-parts.tsx';
import type { TokenColumn } from './token-parts.tsx';

/** A column of samples drawn with the token, such as `(ref) => ({ inlineSize: ref })`. */
function sampleColumn(
  className: string,
  style: (ref: string) => CSSProperties,
  title = 'Sample',
): TokenColumn {
  return {
    title,
    render: (doc) => (
      <span className={className} style={style(`var(${doc.name})`)} aria-hidden="true" />
    ),
  };
}

/** Padding and gaps, as bars as long as the space. */
export function SpaceTokens(): ReactElement {
  return (
    <TokenTable
      rows={tokensIn('space.')}
      columns={[sampleColumn('docs-token-bar', (ref) => ({ inlineSize: ref })), VALUE_COLUMN]}
    />
  );
}

/** Overlays whose sizes are `size.<overlay>` or `size.<overlay>-<size>`. */
const OVERLAYS = new Set(['dialog', 'drawer', 'popover']);

const isOverlaySize = (doc: TokenDoc): boolean =>
  OVERLAYS.has(doc.token.slice('size.'.length).split('-')[0] ?? '');

/** Control heights and icon sizes, as boxes of the size. */
export function SizeTokens(): ReactElement {
  return (
    <TokenTable
      rows={tokensIn('size.').filter((doc) => !isOverlaySize(doc))}
      columns={[
        sampleColumn('docs-token-box', (ref) => ({ inlineSize: ref, blockSize: ref })),
        VALUE_COLUMN,
      ]}
    />
  );
}

/**
 * How wide dialogs and popovers grow and how far drawers reach in, as bars at a quarter of the
 * size: at full size, the widest would not fit the column.
 */
export function OverlaySizeTokens(): ReactElement {
  return (
    <TokenTable
      rows={tokensIn('size.').filter((doc) => isOverlaySize(doc))}
      columns={[
        sampleColumn(
          'docs-token-bar',
          (ref) => ({ inlineSize: `calc(${ref} / 4)` }),
          'Sample (1:4)',
        ),
        VALUE_COLUMN,
      ]}
    />
  );
}

/** Corner radii, as boxes with the corners. */
export function RadiusTokens(): ReactElement {
  return (
    <TokenTable
      rows={tokensIn('radius.')}
      columns={[sampleColumn('docs-token-box', (ref) => ({ borderRadius: ref })), VALUE_COLUMN]}
    />
  );
}

/** Border and focus ring widths, as boxes with the border. */
export function BorderWidthTokens(): ReactElement {
  return (
    <TokenTable
      rows={tokensIn('border-width.')}
      columns={[sampleColumn('docs-token-box', (ref) => ({ borderWidth: ref })), VALUE_COLUMN]}
    />
  );
}
