import { fileTextIcon, githubIcon, lightbulbIcon } from '@contour-ui/icons';
import { Icon } from '@contour-ui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Card, Cards, Prose } from './index.ts';

const meta: Meta<typeof Cards> = {
  title: 'Fumadocs/MDX/Cards',
  component: Cards,
  subcomponents: { Card },
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
 * Cards that link to pages: through the framework's `Link` for a page of the site, in a new tab
 * for another site. The whole card is the link; the text under the title is the `description`
 * or the children. One column on phones, two from 40rem.
 */
export const Links: Story = {
  render: () => (
    <Cards>
      <Card title="Guide" href="/docs/guide">
        How contour-ui works: packages, installation, themes, styling with tokens.
      </Card>
      <Card
        title="Essentials"
        href="/docs/essentials"
        description="Styled general-purpose components."
      />
      <Card title="Forms" href="/docs/essentials/forms" description="Checkbox and Select." />
      <Card
        title="GitHub"
        href="https://github.com/contour-ui/contour-ui"
        description="The source, the issues and the releases."
      />
    </Cards>
  ),
  play: async ({ canvas }) => {
    const guide = canvas.getByRole('link', { name: /^Guide/u });
    await expect(guide).toHaveAttribute('href', '/docs/guide');
    await expect(guide).toHaveAttribute('data-framework-link');
    const github = canvas.getByRole('link', { name: /^GitHub/u });
    await expect(github).toHaveAttribute('target', '_blank');
    await expect(github).not.toHaveAttribute('data-framework-link');
  },
};

/** `icon` shows above the title. */
export const Icons: Story = {
  render: () => (
    <Cards>
      <Card
        title="Read the guide"
        href="/docs/guide"
        icon={<Icon icon={fileTextIcon} />}
        description="Start here."
      />
      <Card
        title="Ideas"
        href="/docs/guide/themes"
        icon={<Icon icon={lightbulbIcon} />}
        description="Themes and tokens."
      />
      <Card
        title="Source"
        href="https://github.com/contour-ui/contour-ui"
        icon={<Icon icon={githubIcon} />}
        description="On GitHub."
      />
    </Cards>
  ),
};

/** Without `href`, a card is a plain panel. */
export const Static: Story = {
  render: () => (
    <Cards>
      <Card title="Accessible">Every component passes axe in both themes.</Card>
      <Card title="Themed">Dark by default, light under one attribute.</Card>
    </Cards>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link')).toBeNull();
  },
};
