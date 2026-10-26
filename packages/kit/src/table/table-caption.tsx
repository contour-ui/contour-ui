import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TableCaptionProps = PrimitiveProps<'caption'>;

/**
 * The table's title: a `caption`, shown under the table in small muted text.
 * It also names the table for assistive technology. Place it first in
 * `Table.Root`.
 */
export function TableCaption({ className, ...props }: TableCaptionProps): ReactElement {
  const ownProps = {
    className: cx('contour-table__caption', className),
    'data-scope': 'table',
    'data-part': 'caption',
  };

  return <Primitive.caption {...mergeProps(ownProps, props)} />;
}
