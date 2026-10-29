import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ThemeToggle } from '../index.ts';

/**
 * The theme toggle. By default, the button that switches between the light and the dark theme:
 * it shows the icon of the theme it switches to, and its name says so. Here the theme starts as
 * the one of the toolbar.
 */
const meta: Meta<typeof ThemeToggle> = {
  title: 'Fumadocs/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The theme of the page, on `<html>`. */
const pageTheme = (): string | undefined => document.documentElement.dataset['theme'];

/**
 * The item of the picker named `name`: the label around its radio button, which shows its icon
 * and takes the clicks.
 */
function itemOf(picker: HTMLElement, name: string): HTMLElement {
  const label = within(picker).getByRole('radio', { name }).closest('label');
  if (label === null) {
    throw new Error(`No item ${name}.`);
  }
  return label;
}

/** The name of the toggle in the theme `theme`: the other theme. */
const nameIn = (theme: string | undefined): string =>
  theme === 'light' ? 'Switch to the dark theme' : 'Switch to the light theme';

/**
 * A click switches the theme of the page (`<html>`, where the overlays take it from) and the
 * stored choice, and the button then offers the other one; a second click switches back.
 */
export const Default: Story = {
  play: async ({ canvas }) => {
    const before = pageTheme();
    const toggle = canvas.getByRole('button', { name: nameIn(before) });

    await userEvent.click(toggle);
    const after = before === 'light' ? 'dark' : 'light';
    await waitFor(async () => {
      await expect(pageTheme()).toBe(after);
    });
    await expect(toggle).toHaveAccessibleName(nameIn(after));
    await expect(localStorage.getItem('contour-theme')).toBe(after);

    // Back to the theme of the toolbar, for the screenshot.
    await userEvent.click(toggle);
    await waitFor(async () => {
      await expect(pageTheme()).toBe(before);
    });
    await expect(toggle).toHaveAccessibleName(nameIn(before));
  },
};

/**
 * `mode="light-dark-system"`: three choices, the light theme, the dark one and the one of the
 * operating system, each an icon named for assistive technology, the choice checked. Here the
 * choice starts as the theme of the toolbar.
 */
export const LightDarkSystem: Story = {
  args: { mode: 'light-dark-system' },
  play: async ({ canvas }) => {
    const before = pageTheme() === 'light' ? 'Light' : 'Dark';
    const picker = canvas.getByRole('radiogroup', { name: 'Theme' });
    await expect(within(picker).getByRole('radio', { name: before })).toBeChecked();

    await userEvent.click(itemOf(picker, 'System'));
    await waitFor(async () => {
      await expect(within(picker).getByRole('radio', { name: 'System' })).toBeChecked();
    });
    await expect(localStorage.getItem('contour-theme')).toBe('system');

    // Back to the theme of the toolbar, for the screenshot.
    await userEvent.click(itemOf(picker, before));
    await waitFor(async () => {
      await expect(within(picker).getByRole('radio', { name: before })).toBeChecked();
    });
  },
};
