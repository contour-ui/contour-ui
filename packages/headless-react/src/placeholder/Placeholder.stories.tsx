import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Placeholder } from '../index.ts';

const meta: Meta<typeof Placeholder.Root> = {
  title: 'Headless/Placeholder',
  component: Placeholder.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Unstyled placeholder' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Unstyled placeholder')).toHaveAttribute('data-part', 'root');
  },
};
