import {
  copyIcon,
  githubIcon,
  menuIcon,
  moonIcon,
  searchIcon,
  sunIcon,
  xIcon,
} from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { expect } from 'storybook/test';

import { IconButton } from '../index.ts';
import type { IconButtonProps } from '../index.ts';

/** Icons to pick from in the `icon` control. */
const icons = {
  search: searchIcon,
  menu: menuIcon,
  copy: copyIcon,
  sun: sunIcon,
  moon: moonIcon,
  x: xIcon,
  github: githubIcon,
};

const meta: Meta<typeof IconButton> = {
  title: 'Essentials/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  argTypes: {
    icon: { control: 'select', options: Object.keys(icons), mapping: icons },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const variants = ['solid', 'subtle', 'outline', 'ghost'] as const satisfies ReadonlyArray<
  IconButtonProps['variant']
>;
const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<IconButtonProps['size']>;
/** Grid columns: every size, then every size disabled. */
const columns = [false, true].flatMap((disabled) => sizes.map((size) => ({ size, disabled })));

const caption: CSSProperties = {
  font: vars.text.caption.font,
  letterSpacing: vars.text.caption.letterSpacing,
  color: vars.color.fg.muted,
};

export const Default: Story = {
  args: { label: 'Search', icon: searchIcon },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Search' });

    await expect(button).toHaveClass('contour-button', 'contour-icon-button');
    await expect(button).toHaveAttribute('data-scope', 'icon-button');
    await expect(button).toHaveAttribute('data-variant', 'solid');
    await expect(button).toHaveAttribute('data-size', 'md');
    // The label names the button; the icon is decorative.
    await expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
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
          <IconButton
            key={`${variant}-${size}-${disabled}`}
            label={`Open menu (${variant})`}
            icon={menuIcon}
            variant={variant}
            size={size}
            disabled={disabled}
          />
        )),
      )}
    </div>
  ),
  play: async ({ canvas }) => {
    const buttons = variants.flatMap((variant) =>
      canvas.getAllByRole('button', { name: `Open menu (${variant})` }),
    );

    await expect(
      buttons.map((button) => ({
        variant: button.dataset['variant'],
        size: button.dataset['size'],
        disabled: button.hasAttribute('disabled'),
      })),
    ).toStrictEqual(
      variants.flatMap((variant) =>
        columns.map(({ size, disabled }) => ({ variant, size, disabled })),
      ),
    );
  },
};

/** A link rendered as an icon button with `asChild`: the icon becomes the link's content. */
export const AsChild: Story = {
  render: () => (
    <IconButton asChild label="GitHub" icon={githubIcon} variant="ghost">
      {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- IconButton gives the link its label and icon. */}
      <a href="https://github.com/contour-ui/contour-ui" />
    </IconButton>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'GitHub' });

    await expect(link).toHaveClass('contour-button', 'contour-icon-button');
    await expect(link).toHaveAttribute('href', 'https://github.com/contour-ui/contour-ui');
    await expect(link).toHaveAttribute('data-variant', 'ghost');
    await expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  },
};
