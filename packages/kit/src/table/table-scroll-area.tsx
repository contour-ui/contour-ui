import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TableScrollAreaProps = PrimitiveProps<'div'>;

const isSet = (value: string | undefined): boolean => value !== undefined && value !== '';

/**
 * A container that scrolls a wide table sideways instead of letting it
 * overflow the page. It is in the tab order (`tabIndex={0}`), so keyboard
 * users can focus it and scroll with the arrow keys. With `aria-label` or
 * `aria-labelledby` it is also a `region` with that name.
 *
 * @example
 * <Table.ScrollArea aria-labelledby="mixer-caption">
 *   <Table.Root>
 *     <Table.Caption id="mixer-caption">Mixer channels</Table.Caption>
 *     …
 *   </Table.Root>
 * </Table.ScrollArea>
 */
export function TableScrollArea({ className, ...props }: TableScrollAreaProps): ReactElement {
  const named = isSet(props['aria-label']) || isSet(props['aria-labelledby']);
  const ownProps = {
    className: cx('contour-table__scroll-area', className),
    'data-scope': 'table',
    'data-part': 'scroll-area',
    // A scrollable region must be reachable by keyboard (axe `scrollable-region-focusable`).
    tabIndex: 0,
    // `mergeProps` skips `undefined`.
    role: named ? 'region' : undefined,
  };

  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
