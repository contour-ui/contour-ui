import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TableBodyProps = PrimitiveProps<'tbody'>;

/** The data rows: a `tbody`. */
export function TableBody({ className, ...props }: TableBodyProps): ReactElement {
  const ownProps = {
    className: cx('contour-table__body', className),
    'data-scope': 'table',
    'data-part': 'body',
  };

  return <Primitive.tbody {...mergeProps(ownProps, props)} />;
}
