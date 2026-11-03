import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TableCellProps = PrimitiveProps<'td'>;

/** A data cell: a `td`. */
export function TableCell({ className, ...props }: TableCellProps): ReactElement {
  const ownProps = {
    className: cx('contour-table__cell', className),
    'data-scope': 'table',
    'data-part': 'cell',
  };

  return <Primitive.td {...mergeProps(ownProps, props)} />;
}
