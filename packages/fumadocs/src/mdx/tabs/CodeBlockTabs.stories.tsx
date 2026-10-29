import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { FrameworkTabs, PackageInstall } from '../../test-utils/tabs.tsx';
import { CodeBlockTabs, Prose } from '../index.ts';

/**
 * Code block tabs, as Fumadocs' remark plugins write them into a page: one frame with the look of
 * a code block, the triggers where its header would be, and the code of the selected tab below,
 * with its copy button at the end of the row of triggers.
 */
const meta: Meta<typeof CodeBlockTabs> = {
  title: 'Fumadocs/MDX/Code block tabs',
  component: CodeBlockTabs,
  tags: ['autodocs'],
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

/**
 * A ` ```package-install ` block (or ` ```npm `): the command of each package manager, as
 * `remarkNpm` makes it, npm first.
 */
export const PackageInstallBlock: Story = {
  name: 'Package install',
  render: () => <PackageInstall packages="@contour-ui/kit @contour-ui/tokens" />,
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('tab').map((tab) => tab.textContent)).toStrictEqual([
      'npm',
      'pnpm',
      'yarn',
      'bun',
    ]);
    await userEvent.click(canvas.getByRole('tab', { name: 'pnpm' }));
    // The panel shown: the others are hidden, out of the accessibility tree.
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent(
      'pnpm add @contour-ui/kit @contour-ui/tokens',
    );
    await expect(canvas.getByRole('button', { name: 'Copy code' })).toBeVisible();
    // Back to the first tab, for the screenshot.
    await userEvent.click(canvas.getByRole('tab', { name: 'npm' }));
  },
};

/**
 * Consecutive code blocks with a `tab` meta, ` ```tsx tab="React Router" ` and
 * ` ```tsx tab="Next.js" `. A block with a title keeps its header under the row of triggers.
 */
export const TabMeta: Story = {
  render: () => <FrameworkTabs />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'Next.js' }));
    await expect(canvas.getByRole('figure', { name: 'app/layout.tsx' })).toBeVisible();
    // Back to the first tab, for the screenshot.
    await userEvent.click(canvas.getByRole('tab', { name: 'React Router' }));
  },
};

/**
 * `tab-group="framework"` on the first block of each: both select the same tab, and the choice
 * is remembered across visits (`localStorage`, under the group id).
 */
export const TabGroup: Story = {
  render: () => (
    <>
      <FrameworkTabs groupId="framework" persist />
      <FrameworkTabs groupId="framework" persist />
    </>
  ),
  play: async ({ canvasElement }) => {
    const [first, second] = within(canvasElement).getAllByRole('tablist');
    if (first === undefined || second === undefined) {
      throw new Error('Two code block tabs expected.');
    }
    await userEvent.click(within(first).getByRole('tab', { name: 'Next.js' }));
    await waitFor(async () => {
      await expect(within(second).getByRole('tab', { name: 'Next.js' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
    await expect(localStorage.getItem('framework')).toBe('Next.js');

    // Back to the first tab, for the screenshot.
    await userEvent.click(within(second).getByRole('tab', { name: 'React Router' }));
    await waitFor(async () => {
      await expect(within(first).getByRole('tab', { name: 'React Router' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  },
};
