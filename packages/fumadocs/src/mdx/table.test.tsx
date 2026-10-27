import type { ComponentProps, ComponentType } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { getMdxComponents } from './get-mdx-components.tsx';

/** The component MDX renders for a table element, from the map. */
function part<E extends 'table' | 'thead' | 'tbody' | 'tr' | 'th' | 'td'>(
  element: E,
): ComponentType<ComponentProps<E>> {
  const Part = getMdxComponents()[element];
  if (typeof Part !== 'function') {
    throw new TypeError(`No component for ${element}`);
  }
  return Part as ComponentType<ComponentProps<E>>;
}

describe('Markdown tables', () => {
  it("render as Kit's table in a scroll area, with the outline variant", async () => {
    const MdxTable = part('table');
    const Thead = part('thead');
    const Tbody = part('tbody');
    const Tr = part('tr');
    const Th = part('th');
    const Td = part('td');
    const screen = await render(
      <MdxTable className="bands">
        <Thead>
          <Tr>
            <Th>Band</Th>
            <Th style={{ textAlign: 'right' }}>Gain</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>Low</Td>
            <Td style={{ textAlign: 'right' }}>+3 dB</Td>
          </Tr>
        </Tbody>
      </MdxTable>,
    );
    const table = screen.getByRole('table').element();
    const gain = screen.getByRole('columnheader', { name: 'Gain' });
    const cell = screen.getByRole('cell', { name: '+3 dB' });

    expect(table).toHaveClass('contour-table bands', { exact: true });
    expect(table).toHaveAttribute('data-variant', 'outline');
    expect(table.parentElement).toHaveClass('contour-table__scroll-area');
    expect(table.parentElement).toHaveAttribute('tabindex', '0');
    expect(table.querySelector('thead')).toHaveAttribute('data-part', 'header');
    expect(table.querySelector('tbody')).toHaveAttribute('data-part', 'body');
    expect(table.querySelector('tr')).toHaveAttribute('data-part', 'row');
    expect(gain.element()).toHaveAttribute('data-part', 'column-header');
    expect(cell.element()).toHaveAttribute('data-part', 'cell');
    // The inline alignment of an aligned Markdown column passes through.
    expect(gain.element()).toHaveAttribute('style', 'text-align: right;');
    expect(cell.element()).toHaveAttribute('style', 'text-align: right;');
  });
});
