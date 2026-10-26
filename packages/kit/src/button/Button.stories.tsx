import { chevronRightIcon, copyIcon, searchIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { expect, userEvent } from 'storybook/test';

import { Button, Icon } from '../index.ts';
import type { ButtonProps } from '../index.ts';

const meta: Meta<typeof Button> = {
  title: 'Kit/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

const variants = ['solid', 'subtle', 'outline', 'ghost'] as const satisfies ReadonlyArray<
  ButtonProps['variant']
>;
const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<ButtonProps['size']>;
/** Grid columns: every size, then every size disabled. */
const columns = [false, true].flatMap((disabled) => sizes.map((size) => ({ size, disabled })));

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.space['group-gap'],
};

const caption: CSSProperties = {
  font: vars.text.caption.font,
  letterSpacing: vars.text.caption.letterSpacing,
  color: vars.color.fg.muted,
};

export const Default: Story = {
  args: { children: 'Get started' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Get started' });

    await expect(button).toHaveClass('contour-button');
    await expect(button).toHaveAttribute('type', 'button');
    await expect(button).toHaveAttribute('data-scope', 'button');
    await expect(button).toHaveAttribute('data-part', 'root');
    await expect(button).toHaveAttribute('data-variant', 'solid');
    await expect(button).toHaveAttribute('data-size', 'md');
  },
};

/** Every variant in every size, enabled and disabled. */
export const Variants: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, max-content)`,
        alignItems: 'center',
        justifyItems: 'start',
        gap: vars.space['group-gap'],
      }}
    >
      {columns.map(({ size, disabled }) => (
        <span key={`${size}-${disabled}`} style={caption}>
          {disabled ? `${size} disabled` : size}
        </span>
      ))}
      {variants.map((variant) =>
        columns.map(({ size, disabled }) => (
          <Button
            key={`${variant}-${size}-${disabled}`}
            variant={variant}
            size={size}
            disabled={disabled}
          >
            {capitalize(variant)}
          </Button>
        )),
      )}
    </div>
  ),
  play: async ({ canvas }) => {
    const buttons = variants.flatMap((variant) =>
      canvas.getAllByRole('button', { name: capitalize(variant) }),
    );

    await expect(
      buttons.map((button) => ({
        variant: button.dataset['variant'],
        size: button.dataset['size'],
        disabled: button.hasAttribute('disabled'),
        dataDisabled: Object.hasOwn(button.dataset, 'disabled'),
      })),
    ).toStrictEqual(
      variants.flatMap((variant) =>
        columns.map(({ size, disabled }) => ({ variant, size, disabled, dataDisabled: disabled })),
      ),
    );
  },
};

/** Icons before or after the label, sized by the button. */
export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'grid', justifyItems: 'start', gap: vars.space['group-gap'] }}>
      {sizes.map((size) => (
        <div key={size} style={row}>
          <Button size={size} variant="outline">
            <Icon icon={searchIcon} />
            Search
          </Button>
          <Button size={size} variant="subtle">
            <Icon icon={copyIcon} />
            Copy
          </Button>
          <Button size={size}>
            Next
            <Icon icon={chevronRightIcon} />
          </Button>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const names = ['Search', 'Copy', 'Next'];

    // Icons are decorative: the accessible name is the label alone.
    await expect(names.map((name) => canvas.getAllByRole('button', { name }).length)).toStrictEqual(
      names.map(() => sizes.length),
    );
  },
};

/** A link rendered as a button with `asChild`; a disabled one does not navigate. */
export const AsChild: Story = {
  render: () => (
    <div style={row}>
      <Button asChild variant="outline" disabled>
        <a href="#previous">Previous</a>
      </Button>
      <Button asChild variant="outline">
        <a href="#next">Next</a>
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const next = canvas.getByRole('link', { name: 'Next' });

    await expect(next).toHaveClass('contour-button');
    await expect(next).toHaveAttribute('href', '#next');
    await expect(next).toHaveAttribute('data-variant', 'outline');
    await expect(next).not.toHaveAttribute('type');
    await expect(next).not.toHaveAttribute('aria-disabled');

    const previous = canvas.getByRole('link', { name: 'Previous' });

    await expect(previous).toHaveClass('contour-button');
    await expect(previous).toHaveAttribute('aria-disabled', 'true');
    await expect(previous).toHaveAttribute('data-disabled');
    await expect(previous).not.toHaveAttribute('disabled');

    const { href } = window.location;
    await userEvent.click(previous);

    await expect(window.location.href).toBe(href);
  },
};
