import { Button, Card, Link } from '@contour-ui/react';
import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { mdx } from '../test-utils/mdx.tsx';
import { Preview, Prose } from './index.ts';

const meta: Meta<typeof Preview> = {
  title: 'Fumadocs/MDX/Preview',
  component: Preview,
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

const H2 = mdx('h2');

/**
 * The frame of a live example. Prose leaves its content alone (`contour-docs-not-prose`): the
 * heading and the list inside keep the styles of the browser and of their components, unlike
 * the ones of the page around it.
 */
export const LiveExample: Story = {
  render: () => (
    <>
      <p>The buttons below are live components, rendered from the package sources.</p>
      <Preview>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: vars.space['control-gap'] }}>
          <Button>Solid</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </Preview>
      <H2 id="cards">Cards</H2>
      <Preview>
        <Card.Root>
          <Card.Body>
            <Card.Title>Plugin preset</Card.Title>
            <Card.Description>
              A styled card, with a <Link href="#cards">link</Link> in its text.
            </Card.Description>
          </Card.Body>
        </Card.Root>
      </Preview>
    </>
  ),
  play: async ({ canvas }) => {
    const preview = canvas.getByRole('button', { name: 'Solid' }).closest('.contour-docs-preview');
    await expect(preview).toHaveClass('contour-docs-not-prose');
  },
};
