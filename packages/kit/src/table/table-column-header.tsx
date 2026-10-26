import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface TableColumnHeaderProps extends PrimitiveProps<'th'> {
  /**
   * The cells this header labels: `col` for the cells under it, `row` for a
   * header at the start of a row.
   *
   * @defaultValue 'col'
   */
  scope?: string | undefined;
}

/** A header cell: a `th` that labels the cells of its column. */
export function TableColumnHeader({ className, ...props }: TableColumnHeaderProps): ReactElement {
  const ownProps = {
    className: cx('contour-table__column-header', className),
    'data-scope': 'table',
    'data-part': 'column-header',
    scope: 'col',
  };

  return <Primitive.th {...mergeProps(ownProps, props)} />;
}
