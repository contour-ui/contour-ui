import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { BUTTON_CODE, CodeExample, CSS_CODE, INSTALL_CODE } from '../test-utils/mdx.tsx';
import { Prose } from './index.ts';

/**
 * A fenced code block of an MDX page, as the MDX map's `pre` draws it with the styled `CodeBlock`:
 * the highlighted code (Shiki's css-variables theme, colored by the syntax tokens), a header
 * with the title from the meta, and a copy button.
 */
const meta: Meta<typeof CodeExample> = {
  title: 'Fumadocs/MDX/Code block',
  component: CodeExample,
  tags: ['autodocs'],
  args: { lines: BUTTON_CODE },
  decorators: [
    (Story) => (
      // In the content of a page, as an MDX page renders it.
      <Prose style={{ maxInlineSize: '44rem' }}>
        <Story />
      </Prose>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** ` ```tsx title="app.tsx" `: the title in a header, with the copy button. */
export const Title: Story = {
  args: { title: 'app.tsx' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('app.tsx')).toBeVisible();
    await expect(canvas.getByRole('button', { name: /copy/iu })).toBeVisible();
  },
};

/** Without a title, the copy button sits at the top end of the code. */
export const NoTitle: Story = {
  args: { lines: INSTALL_CODE },
};

/** `noCopy`: no copy button. */
export const NoCopy: Story = {
  args: { lines: INSTALL_CODE, noCopy: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/** `lineNumbers=3`: the lines are numbered from 3. A long line scrolls sideways. */
export const LineNumbers: Story = {
  args: { title: 'panel.css', lines: CSS_CODE, lineNumbers: 3 },
  play: async ({ canvasElement }) => {
    const pre = within(canvasElement)
      .getByText(/A panel/u)
      .closest('pre');
    await expect(pre).toHaveAttribute('data-line-numbers');
    await expect(pre).toHaveStyle({ 'counter-reset': 'contour-code-block-line 2' });
  },
};
