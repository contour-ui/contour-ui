import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import { CloseButton } from '../index.ts';

const meta: Meta<typeof CloseButton> = {
  title: 'Essentials/CloseButton',
  component: CloseButton,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { onClick: fn<() => void>() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Close' });

    await expect(button).toHaveClass(
      'contour-button',
      'contour-icon-button',
      'contour-close-button',
    );
    await expect(button).toHaveAttribute('data-scope', 'close-button');
    await expect(button).toHaveAttribute('data-variant', 'ghost');

    await userEvent.click(button);

    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

/** Every size, and a label that says what closes. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: vars.space['group-gap'] }}>
      <CloseButton size="sm" />
      <CloseButton size="md" />
      <CloseButton size="lg" />
      <CloseButton label="Close search" />
    </div>
  ),
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole('button', { name: 'Close' });

    await expect(buttons.map((button) => button.dataset['size'])).toStrictEqual(['sm', 'md', 'lg']);
    await expect(canvas.getByRole('button', { name: 'Close search' })).toHaveAttribute(
      'data-size',
      'md',
    );
  },
};
