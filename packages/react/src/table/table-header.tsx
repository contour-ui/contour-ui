import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TableHeaderProps = PrimitiveProps<'thead'>;

/** The header rows: a `thead`, usually one `Table.Row` of `Table.ColumnHeader`s. */
export function TableHeader({ className, ...props }: TableHeaderProps): ReactElement {
  const ownProps = {
    className: cx('contour-table__header', className),
    'data-scope': 'table',
    'data-part': 'header',
  };

  return <Primitive.thead {...mergeProps(ownProps, props)} />;
}
