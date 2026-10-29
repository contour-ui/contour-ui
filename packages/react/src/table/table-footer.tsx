import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TableFooterProps = PrimitiveProps<'tfoot'>;

/** The summary rows under the data, such as totals: a `tfoot`. */
export function TableFooter({ className, ...props }: TableFooterProps): ReactElement {
  const ownProps = {
    className: cx('contour-table__footer', className),
    'data-scope': 'table',
    'data-part': 'footer',
  };

  return <Primitive.tfoot {...mergeProps(ownProps, props)} />;
}
