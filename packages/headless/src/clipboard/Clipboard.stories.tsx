import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import { Clipboard } from '../index.ts';

/**
 * Stands in for `navigator.clipboard.writeText`: the stories never touch the real clipboard,
 * whose permissions a test browser does not grant.
 */
const writeText = fn((_text: string): Promise<void> => Promise.resolve()).mockName('writeText');

const meta: Meta<typeof Clipboard.Root> = {
  title: 'Headless/Clipboard',
  component: Clipboard.Root,
  tags: ['autodocs'],
  beforeEach: () => {
    writeText.mockClear();
    // An own property hides the browser's getter on `Navigator.prototype` until the cleanup.
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    return () => {
      Reflect.deleteProperty(navigator, 'clipboard');
    };
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A trigger, and next to it an indicator that reads "Copied" for a second after a copy. The
 * text of the trigger never changes, so it stays in the accessible name.
 */
export const Default: Story = {
  args: { value: 'pnpm add @contour-ui/headless', timeout: 1000 },
  render: (args) => (
    <Clipboard.Root {...args}>
      <code>{args.value}</code> <Clipboard.Trigger>Copy</Clipboard.Trigger>{' '}
      <Clipboard.Indicator copied="Copied" />
    </Clipboard.Root>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Copy to clipboard' });
    await userEvent.click(trigger);

    await expect(writeText).toHaveBeenCalledWith('pnpm add @contour-ui/headless');
    // Copied once the write is done.
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('data-copied');
    });
    await expect(canvas.getByText('Copied')).toHaveAttribute('data-part', 'indicator');
    await expect(canvas.getByRole('status')).toHaveTextContent('Copied to clipboard');

    // The copied state ends after `timeout`.
    await waitFor(
      async () => {
        await expect(trigger).not.toHaveAttribute('data-copied');
      },
      { timeout: 3000 },
    );
    await expect(canvas.queryByText('Copied')).not.toBeInTheDocument();
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement();
  },
};

const glyph = {
  'aria-hidden': true,
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Two squares, drawn for the stories: Headless has no icons. */
function CopyGlyph(): ReactElement {
  return (
    <svg {...glyph} data-glyph="copy">
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M3 11V4.5A1.5 1.5 0 0 1 4.5 3H11" />
    </svg>
  );
}

/** A check mark, drawn for the stories. */
function CheckGlyph(): ReactElement {
  return (
    <svg {...glyph} data-glyph="check">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

/**
 * A trigger with only an icon, which turns into a check mark while copied. The icons are hidden
 * from assistive technology: the trigger keeps its label, and the status element announces the
 * copy. The story ends in the copied state, so the accessibility check sees it.
 */
export const WithIcons: Story = {
  args: { value: 'npm install @contour-ui/headless' },
  render: (args) => (
    <Clipboard.Root {...args}>
      <code>{args.value}</code>{' '}
      <Clipboard.Trigger>
        <Clipboard.Indicator copied={<CheckGlyph />}>
          <CopyGlyph />
        </Clipboard.Indicator>
      </Clipboard.Trigger>
    </Clipboard.Root>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Copy to clipboard' });
    await expect(trigger.querySelector('svg')).toHaveAttribute('data-glyph', 'copy');
    await userEvent.click(trigger);

    await expect(writeText).toHaveBeenCalledWith('npm install @contour-ui/headless');
    await waitFor(async () => {
      await expect(trigger.querySelector('svg')).toHaveAttribute('data-glyph', 'check');
    });
    await expect(canvas.getByRole('button', { name: 'Copy to clipboard' })).toBe(trigger);
  },
};

const commands = new Map([
  ['npm', 'npm install @contour-ui/headless'],
  ['pnpm', 'pnpm add @contour-ui/headless'],
  ['yarn', 'yarn add @contour-ui/headless'],
  ['bun', 'bun add @contour-ui/headless'],
]);

/** The owner keeps the command in its state and passes it as `value`. */
function InstallCommand(): ReactElement {
  const [manager, setManager] = useState('npm');
  const command = commands.get(manager) ?? '';
  return (
    <Clipboard.Root value={command} timeout={1000}>
      <label>
        Package manager{' '}
        <select
          value={manager}
          onChange={(event) => {
            setManager(event.target.value);
          }}
        >
          {[...commands.keys()].map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>{' '}
      <code>{command}</code> <Clipboard.Trigger>Copy</Clipboard.Trigger>
    </Clipboard.Root>
  );
}

/** A controlled value: the trigger copies the command of the selected package manager. */
export const Controlled: Story = {
  render: () => <InstallCommand />,
  play: async ({ canvas }) => {
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: 'Package manager' }),
      'pnpm',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Copy to clipboard' }));

    await expect(writeText.mock.calls).toStrictEqual([['pnpm add @contour-ui/headless']]);
  },
};
