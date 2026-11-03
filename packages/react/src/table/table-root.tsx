import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface TableRootProps extends PrimitiveProps<'table'> {
  /**
   * `line` draws a divider between rows; `outline` also draws a rounded border
   * around the table.
   *
   * @defaultValue 'line'
   */
  variant?: 'line' | 'outline' | undefined;
  /**
   * Cell padding: `sm` for dense data, `md` for reading.
   *
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | undefined;
}

/**
 * A table as wide as its container. Wrap a table that may be wider than the
 * page in `Table.ScrollArea`.
 *
 * @example
 * <Table.Root variant="outline">
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.ColumnHeader>Band</Table.ColumnHeader>
 *       <Table.ColumnHeader>Gain</Table.ColumnHeader>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     <Table.Row>
 *       <Table.Cell>Low shelf</Table.Cell>
 *       <Table.Cell>+2.5 dB</Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table.Root>
 */
export function TableRoot({
  variant = 'line',
  size = 'md',
  className,
  ...props
}: TableRootProps): ReactElement {
  const ownProps = {
    className: cx('contour-table', className),
    'data-scope': 'table',
    'data-part': 'root',
    'data-variant': variant,
    'data-size': size,
  };

  return <Primitive.table {...mergeProps(ownProps, props)} />;
}
