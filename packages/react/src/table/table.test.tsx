import { vars } from '@contour-ui/tokens';
import { createRef } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, test } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import type { Locator } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Table } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** A length token in pixels, e.g. `8px`. */
const px = (value: string): string => computed('padding-top', value);

/** A color token as the browser computes it. */
const color = (value: string): string => computed('color', value);

/** Computed style of the element a locator finds. */
const styleOf = (locator: Locator): CSSStyleDeclaration => getComputedStyle(locator.element());

/** Top and inline-start padding of a cell. */
const padding = (cell: Locator): string[] => {
  const style = styleOf(cell);
  return [style.paddingTop, style.paddingInlineStart];
};

/** Line style of a cell's bottom border: its divider from the next row. */
const divider = (cell: Locator): string => styleOf(cell).borderBottomStyle;

/** Text alignment of a cell. */
const alignment = (cell: Locator): string => styleOf(cell).textAlign;

interface BandsProps extends Table.RootProps {
  readonly caption?: string;
  readonly footer?: boolean;
}

/** Two bands under a header row, optionally with a footer row of totals. */
function Bands({ caption = 'Bands', footer = false, ...props }: BandsProps): ReactElement {
  return (
    <Table.Root {...props}>
      <Table.Caption>{caption}</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Band</Table.ColumnHeader>
          <Table.ColumnHeader>Gain</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Low shelf</Table.Cell>
          <Table.Cell>+2.5 dB</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>High shelf</Table.Cell>
          <Table.Cell>+1.0 dB</Table.Cell>
        </Table.Row>
      </Table.Body>
      {footer && (
        <Table.Footer>
          <Table.Row>
            <Table.ColumnHeader scope="row">Total</Table.ColumnHeader>
            <Table.Cell>+3.5 dB</Table.Cell>
          </Table.Row>
        </Table.Footer>
      )}
    </Table.Root>
  );
}

const COLUMNS = Array.from({ length: 12 }, (_, index) => `Column ${index + 1}`);

/** One row of twelve columns in a 240 px wide scroll area. */
function WideTable(): ReactElement {
  return (
    <div style={{ inlineSize: '240px' }}>
      <Table.ScrollArea aria-label="Wide table">
        <Table.Root>
          <Table.Body>
            <Table.Row>
              {COLUMNS.map((column) => (
                <Table.Cell key={column}>{column}</Table.Cell>
              ))}
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </div>
  );
}

describe('Table', () => {
  test('renders each part as its element, with its class and part attributes', async () => {
    const screen = await render(
      <Table.ScrollArea>
        <Bands footer />
      </Table.ScrollArea>,
    );
    const elements = screen.container.querySelectorAll<HTMLElement>('[data-scope="table"]');
    const parts = [...elements].map(
      (element) =>
        `${element.dataset['part']} ${element.tagName.toLowerCase()} ${element.className}`,
    );

    expect(new Set(parts)).toStrictEqual(
      new Set([
        'scroll-area div contour-table__scroll-area',
        'root table contour-table',
        'caption caption contour-table__caption',
        'header thead contour-table__header',
        'body tbody contour-table__body',
        'footer tfoot contour-table__footer',
        'row tr contour-table__row',
        'column-header th contour-table__column-header',
        'cell td contour-table__cell',
      ]),
    );
  });

  test('renders the variant and the size, defaults included', async () => {
    const screen = await render(
      <>
        <Bands caption="Default" />
        <Bands caption="Outline" variant="outline" size="sm" />
      </>,
    );
    const standard = screen.getByRole('table', { name: 'Default' });
    const outline = screen.getByRole('table', { name: 'Outline' });

    await expect.element(standard).toHaveAttribute('data-variant', 'line');
    await expect.element(standard).toHaveAttribute('data-size', 'md');
    await expect.element(outline).toHaveAttribute('data-variant', 'outline');
    await expect.element(outline).toHaveAttribute('data-size', 'sm');
  });

  test('merges the className and passes other props and the ref through', async () => {
    const ref = createRef<HTMLTableElement>();
    const screen = await render(<Bands ref={ref} className="extra" id="bands" />);
    const table = screen.getByRole('table', { name: 'Bands' });

    await expect.element(table).toHaveClass('contour-table', 'extra');
    await expect.element(table).toHaveAttribute('id', 'bands');
    expect(ref.current).toBe(table.element());
  });

  test('labels the column by default and the row with scope="row"', async () => {
    const screen = await render(<Bands footer />);

    await expect
      .element(screen.getByRole('columnheader', { name: 'Band' }))
      .toHaveAttribute('scope', 'col');
    await expect
      .element(screen.getByRole('rowheader', { name: 'Total' }))
      .toHaveAttribute('scope', 'row');
  });

  test('is styled with semantic tokens', async () => {
    const screen = await render(<Bands variant="outline" />);
    const table = styleOf(screen.getByRole('table', { name: 'Bands' }));
    const header = styleOf(screen.getByRole('columnheader', { name: 'Band' }));
    const cell = styleOf(screen.getByRole('cell', { name: 'Low shelf' }));
    const caption = styleOf(screen.getByText('Bands'));

    // The tokens resolve to real values (tokens.css is loaded), and the kit uses them.
    expect(color(vars.color.border.default)).toMatch(/^oklch\(/u);
    expect(table.borderTopColor).toBe(color(vars.color.border.default));
    expect(table.borderTopWidth).toBe(px(vars['border-width'].default));
    expect(table.borderTopLeftRadius).toBe(px(vars.radius.panel));

    expect(header.color).toBe(color(vars.color.fg.muted));
    expect(header.fontSize).toBe(computed('font-size', vars.text.label.fontSize));
    expect(header.fontWeight).toBe(computed('font-weight', vars.text.label.fontWeight));
    expect(header.letterSpacing).toBe(computed('letter-spacing', vars.text.label.letterSpacing));

    expect(cell.color).toBe(color(vars.color.fg.default));
    expect(cell.fontSize).toBe(computed('font-size', vars.text.body.fontSize));
    expect(cell.fontFamily).toBe(computed('font-family', vars.text.body.fontFamily));
    expect(cell.borderBottomColor).toBe(color(vars.color.border.subtle));
    expect(cell.borderBottomWidth).toBe(px(vars['border-width'].default));

    expect(caption.color).toBe(color(vars.color.fg.muted));
    expect(caption.fontSize).toBe(computed('font-size', vars.text.caption.fontSize));
  });

  test('pads the cells by size', async () => {
    const screen = await render(
      <>
        <Bands caption="Small" size="sm" />
        <Bands caption="Medium" />
      </>,
    );
    const small = screen.getByRole('table', { name: 'Small' });
    const medium = screen.getByRole('table', { name: 'Medium' });
    const smallPadding = [px(vars.space['control-gap']), px(vars.space['group-gap'])];
    const mediumPadding = [px(vars.space['group-gap']), px(vars.space['panel-inset'])];

    expect(padding(small.getByRole('columnheader', { name: 'Band' }))).toStrictEqual(smallPadding);
    expect(padding(small.getByRole('cell', { name: 'Low shelf' }))).toStrictEqual(smallPadding);
    expect(padding(medium.getByRole('columnheader', { name: 'Band' }))).toStrictEqual(
      mediumPadding,
    );
    expect(padding(medium.getByRole('cell', { name: 'Low shelf' }))).toStrictEqual(mediumPadding);
  });

  test('draws a divider between rows and none under the last row', async () => {
    const screen = await render(
      <>
        <Bands caption="Plain" />
        <Bands caption="With footer" footer />
      </>,
    );
    const plain = screen.getByRole('table', { name: 'Plain' });
    const withFooter = screen.getByRole('table', { name: 'With footer' });

    expect(divider(plain.getByRole('columnheader', { name: 'Band' }))).toBe('solid');
    expect(divider(plain.getByRole('cell', { name: 'Low shelf' }))).toBe('solid');
    expect(divider(plain.getByRole('cell', { name: 'High shelf' }))).toBe('none');
    expect(divider(withFooter.getByRole('cell', { name: 'High shelf' }))).toBe('solid');
    expect(divider(withFooter.getByRole('rowheader', { name: 'Total' }))).toBe('none');
  });

  test('aligns cells to the start unless they set their own alignment', async () => {
    const screen = await render(
      <Table.Root aria-label="Aligned">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader style={{ textAlign: 'center' }}>Pan</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Kick</Table.Cell>
            <Table.Cell style={{ textAlign: 'right' }}>Center</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>,
    );
    expect(alignment(screen.getByRole('columnheader', { name: 'Name' }))).toBe('start');
    expect(alignment(screen.getByRole('columnheader', { name: 'Pan' }))).toBe('center');
    expect(alignment(screen.getByRole('cell', { name: 'Kick' }))).toBe('start');
    expect(alignment(screen.getByRole('cell', { name: 'Center' }))).toBe('right');
  });
});

describe('Table.ScrollArea', () => {
  test('is in the tab order, and a region only when it has a name', async () => {
    const screen = await render(
      <>
        <span id="area-label">Labelled area</span>
        <Table.ScrollArea />
        <Table.ScrollArea aria-label="Named area" />
        <Table.ScrollArea aria-labelledby="area-label" />
        <Table.ScrollArea aria-label="" />
      </>,
    );
    const areas = [...screen.container.querySelectorAll('.contour-table__scroll-area')];

    expect(areas.map((area) => area.getAttribute('tabindex'))).toStrictEqual(['0', '0', '0', '0']);
    expect(areas.map((area) => area.getAttribute('role'))).toStrictEqual([
      null,
      'region',
      'region',
      null,
    ]);
    await expect.element(screen.getByRole('region', { name: 'Named area' })).toBeInTheDocument();
    await expect.element(screen.getByRole('region', { name: 'Labelled area' })).toBeInTheDocument();
  });

  test('lets the user take it out of the tab order', async () => {
    const screen = await render(<Table.ScrollArea tabIndex={-1} aria-label="Bands" />);

    await expect
      .element(screen.getByRole('region', { name: 'Bands' }))
      .toHaveAttribute('tabindex', '-1');
  });

  test('scrolls a wide table with the arrow keys', async () => {
    const screen = await render(<WideTable />);
    const area = screen.getByRole('region', { name: 'Wide table' });
    const element = area.element();

    expect(element.scrollWidth).toBeGreaterThan(element.clientWidth);
    expect(element.scrollLeft).toBe(0);

    await userEvent.tab();
    await expect.element(area).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');

    await expect.poll(() => element.scrollLeft).toBeGreaterThan(0);
  });

  test('shows the focus ring when focused from the keyboard', async () => {
    const screen = await render(<WideTable />);
    const area = screen.getByRole('region', { name: 'Wide table' });

    await userEvent.tab();
    await expect.element(area).toHaveFocus();
    const ring = styleOf(area);

    expect(ring.outlineStyle).toBe('solid');
    expect(ring.outlineColor).toBe(color(vars.color.border.focus));
    expect(ring.outlineWidth).toBe(px(vars['border-width'].focus));
    expect(ring.outlineOffset).toBe(px(vars['border-width'].focus));
  });
});
