import { Table } from '@contour-ui/kit';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ReactElement } from 'react';

/**
 * A Markdown table as Kit's `Table`, scrolling sideways when it is wider than the column. The
 * outline frames it like the other blocks of a page (code blocks, alerts, examples), and in the
 * light theme the row dividers alone barely show where it ends.
 */
function MdxTable(props: ComponentProps<'table'>): ReactElement {
  return (
    <Table.ScrollArea>
      <Table.Root {...props} variant="outline" />
    </Table.ScrollArea>
  );
}

/**
 * Markdown table elements as Kit's table parts. Their props pass through, the inline
 * `text-align` of an aligned column included.
 */
export const mdxTableComponents = {
  table: MdxTable,
  thead: Table.Header,
  tbody: Table.Body,
  tr: Table.Row,
  th: Table.ColumnHeader,
  td: Table.Cell,
} satisfies MDXComponents;
