import { lightbulbIcon } from '@contour-ui/icons';
import { Icon } from '@contour-ui/kit';
import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Callout, Prose } from './index.ts';

const meta: Meta<typeof Callout> = {
  title: 'Fumadocs/MDX/Callout',
  component: Callout,
  tags: ['autodocs'],
  args: {
    title: 'Pre-release',
    children: 'The packages are not on npm yet.',
  },
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

/** `type="info"`, the default: Kit's `Alert` with the `info` status. */
export const Info: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Pre-release').closest('[data-part="root"]')).toHaveAttribute(
      'data-status',
      'info',
    );
  },
};

/**
 * Every type of Fumadocs' callouts and the status of the alert it becomes: `warn` and `warning`
 * are `warning`, `error` is `danger`, `idea` is `neutral`.
 */
export const Types: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: vars.space['group-gap'] }}>
      <Callout type="info" title="Info">
        Themes switch with the <code>data-theme</code> attribute.
      </Callout>
      <Callout type="warn" title="Warn">
        The sidebar state is stored in <code>localStorage</code>.
      </Callout>
      <Callout type="warning" title="Warning">
        Load the stylesheet of the layout before Kit&apos;s.
      </Callout>
      <Callout type="error" title="Error">
        A page outside the page tree has no neighbours.
      </Callout>
      <Callout type="success" title="Success">
        The search index is ready.
      </Callout>
      <Callout type="idea" title="Idea">
        Add your own components to the MDX map.
      </Callout>
    </div>
  ),
  play: async ({ canvas }) => {
    const statuses = ['Info', 'Warn', 'Warning', 'Error', 'Success', 'Idea'].map(
      (title) =>
        canvas.getByText(title).closest<HTMLElement>('[data-part="root"]')?.dataset['status'],
    );
    await expect(statuses).toStrictEqual([
      'info',
      'warning',
      'warning',
      'danger',
      'success',
      'neutral',
    ]);
  },
};

/** Paragraphs and a list in the content, without a title. */
export const Content: Story = {
  args: {
    title: undefined,
    children: (
      <>
        <p>The packages are not on npm yet.</p>
        <ul>
          <li>Kit and Headless have their first components.</li>
          <li>Audio still shows a placeholder.</li>
        </ul>
      </>
    ),
  },
};

/** `icon` replaces the icon of the status. */
export const CustomIcon: Story = {
  args: {
    type: 'idea',
    title: 'Tip',
    icon: <Icon icon={lightbulbIcon} />,
    children: 'Press ⌘K anywhere to search the docs.',
  },
};
