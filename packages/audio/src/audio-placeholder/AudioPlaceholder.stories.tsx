import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { AudioPlaceholder } from '../index.ts';

const meta: Meta<typeof AudioPlaceholder.Root> = {
  title: 'Audio/Placeholder',
  component: AudioPlaceholder.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: '-12 dB' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('-12 dB')).toHaveClass('contour-audio-placeholder');
  },
};
