import { Table } from '@contour-ui/react';
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
