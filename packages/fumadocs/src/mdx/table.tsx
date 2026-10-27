'use client';

import { Table } from '@contour-ui/kit';
import type { ComponentProps, ReactElement } from 'react';

/**
 * A Markdown table as Kit's `Table`, scrolling sideways when it is wider than the column. The
 * outline frames it like the other blocks of a page (code blocks, alerts, examples), and in the
 * light theme the row dividers alone barely show where it ends.
 */
export function MdxTable(props: ComponentProps<'table'>): ReactElement {
  return (
    <Table.ScrollArea>
      <Table.Root {...props} variant="outline" />
    </Table.ScrollArea>
  );
}

/*
 * The other Markdown table elements are Kit's table parts. Their props pass through, the inline
 * `text-align` of an aligned column included. Each is an export of its own: a map built on the
 * server holds the exports of a client module as references, and cannot read inside one.
 */

/** `thead` as `Table.Header`. */
export const MdxTableHeader: typeof Table.Header = Table.Header;
/** `tbody` as `Table.Body`. */
export const MdxTableBody: typeof Table.Body = Table.Body;
/** `tr` as `Table.Row`. */
export const MdxTableRow: typeof Table.Row = Table.Row;
/** `th` as `Table.ColumnHeader`. */
export const MdxTableColumnHeader: typeof Table.ColumnHeader = Table.ColumnHeader;
/** `td` as `Table.Cell`. */
export const MdxTableCell: typeof Table.Cell = Table.Cell;
