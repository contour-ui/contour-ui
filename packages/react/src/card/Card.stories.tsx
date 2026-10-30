import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement, ReactNode } from 'react';
import { expect } from 'storybook/test';

import { Card } from '../index.ts';

const VARIANTS = [
  ['outline', 'Outline'],
  ['subtle', 'Subtle'],
  ['elevated', 'Elevated'],
] as const;

const SIZES = ['sm', 'md', 'lg'] as const;

/** Story layout: three columns, so a single card is as wide as one column of the variant grid. */
function Columns({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        alignItems: 'start',
        gap: vars.space['section-gap'],
      }}
    >
      {children}
    </div>
  );
}

const meta: Meta<typeof Card.Root> = {
  title: 'Essentials/Card',
  component: Card.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Every variant (rows) in every size (columns): the size sets the padding and the gap between parts. */
export const Variants: Story = {
  render: () => (
    <Columns>
      {VARIANTS.flatMap(([variant, label]) =>
        SIZES.map((size) => (
          <Card.Root key={`${variant}-${size}`} variant={variant} size={size}>
            <Card.Header>
              <Card.Title>{label}</Card.Title>
              <Card.Description>{`Size ${size}`}</Card.Description>
            </Card.Header>
            <Card.Body>Padding and gaps follow the size.</Card.Body>
          </Card.Root>
        )),
      )}
    </Columns>
  ),
  play: async ({ canvas }) => {
    const rendered = VARIANTS.flatMap(([, label]) =>
      canvas.getAllByRole('heading', { level: 3, name: label }).map((title) => {
        const root = title.closest<HTMLElement>('.contour-card');
        return `${root?.dataset['variant']} ${root?.dataset['size']}`;
      }),
    );
    await expect(rendered).toEqual(
      VARIANTS.flatMap(([variant]) => SIZES.map((size) => `${variant} ${size}`)),
    );
  },
};

/**
 * A link as the root: the whole card is one link, named by its content, title first. The play
 * function focuses it with Tab, so the story shows the focus ring.
 */
export const AsLink: Story = {
  render: () => (
    <Columns>
      <Card.Root asChild>
        {/* The link text is in the title and the description, where lint does not look. */}
        {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
        <a href="/docs/essentials">
          <Card.Body>
            <Card.Title>Essentials</Card.Title>
            <Card.Description>The everyday components.</Card.Description>
          </Card.Body>
        </a>
      </Card.Root>
    </Columns>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getAllByRole('link')).toHaveLength(1);
    const link = canvas.getByRole('link', { name: /^Essentials\b/u });
    await expect(link).toHaveClass('contour-card');

    await userEvent.tab();
    await expect(link).toHaveFocus();
  },
};

/** Header, body and footer; the footer lays out its items in a row. */
export const Parts: Story = {
  render: () => (
    <Columns>
      <Card.Root>
        <Card.Header>
          <Card.Title>Live set</Card.Title>
          <Card.Description>Recorded on 12 October.</Card.Description>
        </Card.Header>
        <Card.Body>Two stereo stems and a click track.</Card.Body>
        <Card.Footer>
          <span>12 tracks</span>
          <span>48 kHz</span>
          <span>4:32</span>
        </Card.Footer>
      </Card.Root>
    </Columns>
  ),
  play: async ({ canvas }) => {
    const title = canvas.getByRole('heading', { level: 3, name: 'Live set' });
    await expect(title.parentElement).toHaveClass('contour-card__header');
    await expect(canvas.getByText('Recorded on 12 October.')).toHaveClass(
      'contour-card__description',
    );
    await expect(canvas.getByText('Two stereo stems and a click track.')).toHaveClass(
      'contour-card__body',
    );
    await expect(canvas.getByText('48 kHz').parentElement).toHaveClass('contour-card__footer');
  },
};
