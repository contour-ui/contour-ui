import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TableRowProps = PrimitiveProps<'tr'>;

/** A row: a `tr` of `Table.Cell`s and `Table.ColumnHeader`s. */
export function TableRow({ className, ...props }: TableRowProps): ReactElement {
  const ownProps = {
    className: cx('contour-table__row', className),
    'data-scope': 'table',
    'data-part': 'row',
  };

  return <Primitive.tr {...mergeProps(ownProps, props)} />;
}
