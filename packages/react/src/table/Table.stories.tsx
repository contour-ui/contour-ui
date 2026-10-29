import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useId } from 'react';
import type { ReactElement } from 'react';
import { expect, userEvent } from 'storybook/test';

import { Table } from '../index.ts';

const VARIANTS = ['line', 'outline'] as const;

const SIZES = ['sm', 'md'] as const;

const BAND_COLUMNS = ['Band', 'Frequency', 'Gain', 'Q'] as const;

const BANDS = [
  ['Low shelf', '120 Hz', '+2.5 dB', '0.71'],
  ['Bell', '1.2 kHz', '-3.0 dB', '1.40'],
  ['High shelf', '8 kHz', '+1.0 dB', '0.71'],
] as const;

const CHANNEL_COLUMNS = [
  'Channel',
  'Input',
  'Gain',
  'Pan',
  'Low',
  'Mid',
  'High',
  'Send A',
  'Send B',
  'Output',
] as const;

const CHANNELS = [
  ['Kick', 'In 1', '+4.0 dB', 'C', '+2.0 dB', '0.0 dB', '-1.5 dB', '-12 dB', 'Off', 'Drums'],
  ['Snare', 'In 2', '+1.5 dB', 'L 10', '0.0 dB', '+1.0 dB', '+2.5 dB', '-9 dB', 'Off', 'Drums'],
  ['Bass', 'DI 1', '+3.0 dB', 'C', '+1.5 dB', '-2.0 dB', '0.0 dB', 'Off', '-18 dB', 'Main'],
  ['Keys', 'In 5', '-2.0 dB', 'R 20', '-3.0 dB', '0.0 dB', '+1.0 dB', '-6 dB', '-10 dB', 'Main'],
] as const;

const PLUGINS = [
  ['EQ', '4', '6.5%'],
  ['Compressor', '3', '4.0%'],
  ['Reverb', '1', '9.5%'],
] as const;

/** End alignment for a numeric column, set inline the way Markdown tables align columns. */
const END = { textAlign: 'end' } as const;

interface BandsProps {
  readonly variant: (typeof VARIANTS)[number];
  readonly size: (typeof SIZES)[number];
}

/** EQ bands in one variant and size, captioned with both. */
function Bands({ variant, size }: BandsProps): ReactElement {
  return (
    <Table.Root variant={variant} size={size}>
      <Table.Caption>{`${variant}, ${size}`}</Table.Caption>
      <Table.Header>
        <Table.Row>
          {BAND_COLUMNS.map((column) => (
            <Table.ColumnHeader key={column}>{column}</Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {BANDS.map((cells) => (
          <Table.Row key={cells[0]}>
            {BAND_COLUMNS.map((column, index) => (
              <Table.Cell key={column}>{cells[index]}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

/**
 * Mixer channels: ten columns in an area too narrow for them, named by the
 * caption. `white-space: nowrap` keeps each value on one line, so the table
 * scrolls instead of wrapping them.
 */
function Mixer(): ReactElement {
  const captionId = useId();
  return (
    <div style={{ maxInlineSize: '24rem' }}>
      <Table.ScrollArea aria-labelledby={captionId}>
        <Table.Root size="sm" style={{ whiteSpace: 'nowrap' }}>
          <Table.Caption id={captionId}>Mixer channels</Table.Caption>
          <Table.Header>
            <Table.Row>
              {CHANNEL_COLUMNS.map((column) => (
                <Table.ColumnHeader key={column}>{column}</Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {CHANNELS.map((cells) => (
              <Table.Row key={cells[0]}>
                {CHANNEL_COLUMNS.map((column, index) => (
                  <Table.Cell key={column}>{cells[index]}</Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </div>
  );
}

const meta: Meta<typeof Table.Root> = {
  title: 'Essentials/Table',
  component: Table.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Every variant (columns) in every size (rows): the size sets the cell padding. */
export const Variants: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        alignItems: 'start',
        gap: vars.space['section-gap'],
      }}
    >
      {SIZES.flatMap((size) =>
        VARIANTS.map((variant) => (
          <Bands key={`${variant}-${size}`} variant={variant} size={size} />
        )),
      )}
    </div>
  ),
  play: async ({ canvas }) => {
    const expected = SIZES.flatMap((size) => VARIANTS.map((variant) => ({ variant, size })));
    const rendered = expected.map(({ variant, size }) => {
      const { dataset } = canvas.getByRole('table', { name: `${variant}, ${size}` });
      return { variant: dataset['variant'], size: dataset['size'] };
    });
    await expect(rendered).toEqual(expected);
  },
};

/**
 * A table wider than its column scrolls inside `Table.ScrollArea`. The area is
 * in the tab order, so the arrow keys scroll it; named by the caption, it is a
 * region. The play function focuses it with Tab, so the story shows the focus ring.
 */
export const ScrollArea: Story = {
  render: () => <Mixer />,
  play: async ({ canvas }) => {
    const area = canvas.getByRole('region', { name: 'Mixer channels' });
    await expect(area.scrollWidth).toBeGreaterThan(area.clientWidth);
    await expect(area).toHaveAttribute('tabindex', '0');

    await userEvent.tab();

    await expect(area).toHaveFocus();
  },
};

/**
 * The caption names the table and sits under it; the footer holds the totals,
 * with a row header (`scope="row"`). The numeric columns are end-aligned with an
 * inline `textAlign`, as Markdown tables align their columns.
 */
export const CaptionAndFooter: Story = {
  render: () => (
    <Table.Root>
      <Table.Caption>CPU load per plugin</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Plugin</Table.ColumnHeader>
          <Table.ColumnHeader style={END}>Instances</Table.ColumnHeader>
          <Table.ColumnHeader style={END}>CPU</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {PLUGINS.map(([plugin, instances, load]) => (
          <Table.Row key={plugin}>
            <Table.Cell>{plugin}</Table.Cell>
            <Table.Cell style={END}>{instances}</Table.Cell>
            <Table.Cell style={END}>{load}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.ColumnHeader scope="row">Total</Table.ColumnHeader>
          <Table.Cell style={END}>8</Table.Cell>
          <Table.Cell style={END}>20.0%</Table.Cell>
        </Table.Row>
      </Table.Footer>
    </Table.Root>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('table', { name: 'CPU load per plugin' })).toBeVisible();
    await expect(canvas.getAllByRole('columnheader')).toHaveLength(3);
    await expect(canvas.getByRole('rowheader', { name: 'Total' })).toHaveAttribute('scope', 'row');
  },
};
