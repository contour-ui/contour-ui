import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactElement } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import { Button, Clipboard } from '../index.ts';

/**
 * Stands in for `navigator.clipboard.writeText`: the stories never touch the real clipboard,
 * whose permissions a test browser does not grant.
 */
const writeText = fn((_text: string): Promise<void> => Promise.resolve()).mockName('writeText');

const meta: Meta<typeof Clipboard.Root> = {
  title: 'Kit/Clipboard',
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

const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<Clipboard.RootProps['size']>;

const caption: CSSProperties = {
  font: vars.text.caption.font,
  letterSpacing: vars.text.caption.letterSpacing,
  color: vars.color.fg.muted,
};

const INSTALL = 'pnpm add @contour-ui/kit';
const LINK = 'https://contour-ui.dev/docs/kit/clipboard';

/** An install command: a `$` prompt, the command, and a trigger with an icon and "Copy". */
function InstallCommand(props: Clipboard.RootProps): ReactElement {
  return (
    <Clipboard.Root value={INSTALL} {...props}>
      <Clipboard.Control>
        <Clipboard.ValueText prompt="$" />
        <Clipboard.Trigger>
          <Clipboard.Indicator />
          Copy
        </Clipboard.Trigger>
      </Clipboard.Control>
    </Clipboard.Root>
  );
}

/**
 * An install command. The copy icon of the trigger turns into a check mark once the browser has
 * written the command, its text and its name stay, and screen readers hear "Copied to
 * clipboard". The story ends in the copied state, so the accessibility check sees it.
 */
export const Default: Story = {
  render: (args) => <InstallCommand {...args} />,
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole('button', { name: 'Copy to clipboard' });
    const root = canvasElement.querySelector('[data-part="root"]');

    await expect(root).toHaveClass('contour-clipboard');
    await expect(root).toHaveAttribute('data-size', 'md');
    await expect(canvas.getByText(INSTALL)).toHaveClass('contour-clipboard__value-text');
    await expect(trigger).toHaveAttribute('data-variant', 'ghost');

    await userEvent.click(trigger);
    await expect(writeText).toHaveBeenCalledWith(INSTALL);
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('data-copied');
    });
    await expect(trigger).toHaveTextContent('Copy');
    await expect(canvas.getByRole('status')).toHaveTextContent('Copied to clipboard');
    await expect(canvas.getByRole('button', { name: 'Copy to clipboard' })).toBe(trigger);
  },
};

/**
 * A label above the control, which names the group, and a trigger without children: a square
 * icon button whose copy icon turns into a check mark. It is named after what it copies.
 */
export const LabelAndIcon: Story = {
  args: { value: LINK },
  render: (args) => (
    <Clipboard.Root {...args} style={{ inlineSize: '22rem' }}>
      <Clipboard.Label>Share link</Clipboard.Label>
      <Clipboard.Control>
        <Clipboard.ValueText />
        <Clipboard.Trigger aria-label="Copy the link" />
      </Clipboard.Control>
    </Clipboard.Root>
  ),
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Share link' });
    const trigger = canvas.getByRole('button', { name: 'Copy the link' });

    await expect(trigger).toHaveClass('contour-icon-button');
    await userEvent.click(trigger);
    await expect(writeText).toHaveBeenCalledWith(LINK);
    await waitFor(async () => {
      await expect(group).toHaveAttribute('data-copied');
    });
    await expect(canvas.getByRole('status')).toHaveTextContent('Copied to clipboard');
  },
};

/** One row of the grid: every kind of trigger in one size. */
function SizeRow({ size }: { readonly size: (typeof sizes)[number] }): ReactElement {
  return (
    <>
      <span style={caption}>{size}</span>
      <InstallCommand size={size} />
      <Clipboard.Root size={size} value="https://contour-ui.dev">
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger aria-label={`Copy the link ${size}`} />
        </Clipboard.Control>
      </Clipboard.Root>
      <Clipboard.Root size={size} value="bun add">
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger variant="subtle">
            <Clipboard.Indicator />
            Copy
          </Clipboard.Trigger>
        </Clipboard.Control>
      </Clipboard.Root>
      <Clipboard.Root size={size} value="yarn add">
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger variant="solid">
            <Clipboard.Indicator />
            Copy
          </Clipboard.Trigger>
        </Clipboard.Control>
      </Clipboard.Root>
      <Clipboard.Root size={size} value="sk-live-4f9a2c">
        <Clipboard.Label>API key</Clipboard.Label>
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger aria-label={`Copy the key ${size}`} />
        </Clipboard.Control>
      </Clipboard.Root>
    </>
  );
}

/**
 * Every size with a ghost trigger (the default) that shows an icon and "Copy", an icon trigger, a
 * `subtle` and a `solid` trigger, and a label above the control. The trigger takes the size of the
 * root and fills the end of the row.
 */
export const Variants: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, max-content)',
        alignItems: 'end',
        justifyItems: 'start',
        gap: vars.space['group-gap'],
      }}
    >
      {sizes.map((size) => (
        <SizeRow key={size} size={size} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const roots = [...canvasElement.querySelectorAll<HTMLElement>('.contour-clipboard')];

    await expect(
      roots.map((root) => [
        root.dataset['size'],
        root.querySelector<HTMLElement>('[data-part="trigger"]')?.dataset['size'],
      ]),
    ).toStrictEqual(sizes.flatMap((size) => Array.from({ length: 5 }, () => [size, size])));
  },
};

/**
 * In a narrow container, the value ends in an ellipsis and the trigger stays whole. The value is
 * still the whole text for screen readers and for the copy.
 */
export const Narrow: Story = {
  render: (args) => (
    <div style={{ display: 'flex', inlineSize: '12rem' }}>
      <InstallCommand {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const value = canvas.getByText(INSTALL);

    await expect(value.scrollWidth).toBeGreaterThan(value.clientWidth);
    await userEvent.click(canvas.getByRole('button', { name: 'Copy to clipboard' }));
    await expect(writeText).toHaveBeenCalledWith(INSTALL);
  },
};

/**
 * In a row with a button of the same size, as on a home page: the control is as high as the
 * button, and the row wraps on a narrow screen.
 */
export const BesideAButton: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: vars.space['group-gap'],
      }}
    >
      <Button size="lg">Get started</Button>
      <InstallCommand
        {...args}
        value="pnpm add @contour-ui/audio"
        size="lg"
        timeout={1500}
        aria-label="Install"
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Get started' });
    const group = canvas.getByRole('group', { name: 'Install' });
    const control = group.querySelector('[data-part="control"]');

    await expect(control?.getBoundingClientRect().height).toBe(
      button.getBoundingClientRect().height,
    );
  },
};
