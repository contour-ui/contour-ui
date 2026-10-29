import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Fragment } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { expect } from 'storybook/test';

import { Kbd } from '../index.ts';
import type { KbdProps } from '../index.ts';

const SIZES = ['sm', 'md'] as const;

const SHORTCUTS: ReadonlyArray<readonly string[]> = [
  ['K'],
  ['⌘', 'K'],
  ['Ctrl', 'K'],
  ['Shift', '⌥', 'P'],
];

const keys: CSSProperties = { display: 'inline-flex', gap: vars.space['control-gap'] };

function Shortcuts({ size }: { readonly size: NonNullable<KbdProps['size']> }): ReactElement {
  return (
    <>
      {SHORTCUTS.map((shortcut) => (
        <span key={shortcut.join(' ')} style={keys}>
          {shortcut.map((key) => (
            <Kbd key={key} size={size}>
              {key}
            </Kbd>
          ))}
        </span>
      ))}
    </>
  );
}

/** Every size (rows) with single keys and combinations (columns). */
function Grid(): ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `auto repeat(${SHORTCUTS.length}, max-content)`,
        alignItems: 'center',
        gap: vars.space['section-gap'],
      }}
    >
      {SIZES.map((size) => (
        <Fragment key={size}>
          <span style={{ color: vars.color.fg.muted }}>{size}</span>
          <Shortcuts size={size} />
        </Fragment>
      ))}
    </div>
  );
}

const meta: Meta<typeof Kbd> = {
  title: 'Essentials/Kbd',
  component: Kbd,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'K' },
  play: async ({ canvas }) => {
    const key = canvas.getByText('K');

    await expect(key).toHaveClass('contour-kbd');
    await expect(key).toHaveAttribute('data-size', 'md');
  },
};

/** Both sizes on the canvas and on a surface, which has the same background as the keys. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', justifyItems: 'start', gap: vars.space['section-gap'] }}>
      <Grid />
      <div
        style={{
          padding: vars.space['panel-inset'],
          border: `${vars['border-width'].default} solid ${vars.color.border.default}`,
          borderRadius: vars.radius.panel,
          background: vars.color.bg.surface,
        }}
      >
        <Grid />
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    const sizes = canvas.getAllByText('Ctrl').map((key) => key.dataset['size']);

    await expect(sizes).toStrictEqual(['sm', 'md', 'sm', 'md']);
  },
};

/** In running text, a key sits on the baseline of the text around it. */
export const InText: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: vars.space['section-gap'], maxInlineSize: '36rem' }}>
      <p style={{ margin: 0 }}>
        Press <Kbd size="sm">Ctrl</Kbd> <Kbd size="sm">K</Kbd> to open the search, then{' '}
        <Kbd size="sm">Enter</Kbd> to go to the first result.
      </p>
      <p
        style={{
          margin: 0,
          font: vars.text.prose.font,
          letterSpacing: vars.text.prose.letterSpacing,
        }}
      >
        Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to open the search, then <Kbd>Enter</Kbd> to go to the first
        result.
      </p>
    </div>
  ),
  play: async ({ canvas }) => {
    const [small, medium] = canvas.getAllByText('Enter');

    await expect(small).toHaveAttribute('data-size', 'sm');
    await expect(medium).toHaveAttribute('data-size', 'md');
  },
};
