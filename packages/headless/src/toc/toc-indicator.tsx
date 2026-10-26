import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useTocContext } from './toc-context.ts';

export type TocIndicatorProps = PrimitiveProps<'div'>;

/**
 * Table of contents indicator: a `div` that marks the active items, hidden from assistive
 * technology, and `hidden` while no item is active or the list is not laid out (`display: none`,
 * as in a closed popover). It carries the box around the active items as `--top`, `--left`,
 * `--width` and `--height`, in pixels, relative to the padding box of the root: position the
 * root (`position: relative`) and the indicator (`position: absolute`), and move it with these
 * values, as the items change, with a transition of your own. When the list is laid out again,
 * it shows already in place, so the transition does not run.
 *
 * @example
 * <Toc.Indicator
 *   style={{ position: 'absolute', top: 'var(--top)', height: 'var(--height)', width: 2 }}
 * />
 */
export function TocIndicator(props: TocIndicatorProps): ReactElement {
  const api = useTocContext();
  return <Primitive.div {...mergeProps(api.getIndicatorProps(), props)} />;
}
