import * as icons from '@contour-ui/icons';
import type { IconData } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Icon } from '../index.ts';

/** Every icon of the set: the `IconData` exports of `@contour-ui/icons`. */
const ICON_SET = Object.values(icons).filter(
  (value): value is IconData => typeof value === 'object' && 'paths' in value,
);

const meta: Meta<typeof Icon> = {
  title: 'Kit/Icon',
  component: Icon,
  tags: ['autodocs'],
  args: { icon: icons.searchIcon },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The whole set at 24 px, with names. */
export const Gallery: Story = {
  render: () => (
    <ul
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
        gap: vars.space['group-gap'],
        margin: 0,
        padding: 0,
        listStyle: 'none',
      }}
    >
      {ICON_SET.map((icon) => (
        <li
          key={icon.name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: vars.space['control-gap'],
            padding: vars.space['panel-inset'],
            font: vars.text.caption.font,
            letterSpacing: vars.text.caption.letterSpacing,
            color: vars.color.fg.muted,
          }}
        >
          <Icon icon={icon} size={24} style={{ color: vars.color.fg.default }} />
          {icon.name}
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(ICON_SET.length);
  },
};

/** `1em` by default, so the icon follows the text; a number is pixels. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: vars.space['group-gap'] }}>
      {(['label', 'body', 'heading', 'subtitle', 'title'] as const).map((style) => (
        <p
          key={style}
          style={{
            margin: 0,
            font: vars.text[style].font,
            letterSpacing: vars.text[style].letterSpacing,
          }}
        >
          <Icon icon={icons.searchIcon} /> Search in {style} text
        </p>
      ))}
      <p style={{ display: 'flex', alignItems: 'center', gap: vars.space['group-gap'], margin: 0 }}>
        <Icon icon={icons.copyIcon} size={vars.size['icon-sm']} />
        <Icon icon={icons.copyIcon} size={vars.size['icon-md']} />
        <Icon icon={icons.copyIcon} size={vars.size['icon-lg']} />
        <Icon icon={icons.copyIcon} size={32} />
      </p>
    </div>
  ),
};

/** The icon paints with the text color (`currentColor`). */
export const Color: Story = {
  render: () => (
    <p style={{ display: 'flex', gap: vars.space['group-gap'], margin: 0 }}>
      <Icon icon={icons.circleCheckIcon} size={20} style={{ color: vars.color.success.fg }} />
      <Icon icon={icons.triangleAlertIcon} size={20} style={{ color: vars.color.warning.fg }} />
      <Icon icon={icons.circleXIcon} size={20} style={{ color: vars.color.danger.fg }} />
      <Icon icon={icons.githubIcon} size={20} style={{ color: vars.color.accent.fg }} />
    </p>
  ),
};

/** With a label the icon is an image with a name; without one it is hidden from assistive technology. */
export const Labeled: Story = {
  args: { icon: icons.githubIcon, label: 'GitHub', size: 24 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'GitHub' })).toHaveClass('contour-icon');
  },
};
