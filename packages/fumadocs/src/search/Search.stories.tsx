import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { SearchTrigger } from '../index.ts';

/**
 * The search of `DocsProvider`: the triggers, and the dialog they open, which runs fumadocs-core's
 * static search in the browser. The stories search a real index of the fixtures' pages, exported
 * as a site's search server exports it and served from a blob (`createSearchIndexUrl()`).
 */
const meta: Meta<typeof SearchTrigger> = {
  title: 'Fumadocs/Search',
  component: SearchTrigger,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      // As wide as the sidebar: the field fills the width its container gives it.
      <div style={{ maxInlineSize: '16rem' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Open the dialog with the trigger, and give the focus time to move into its field. */
async function openSearch(trigger: HTMLElement): Promise<HTMLElement> {
  await userEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Search' });
  const field = within(dialog).getByRole('combobox', { name: 'Search the docs' });
  await waitFor(async () => {
    await expect(field).toHaveFocus();
  });
  return field;
}

/**
 * `field`, the default, as in the sidebar: the label and the shortcut of the platform, ⌘K on
 * Apple platforms and Ctrl K elsewhere. `icon`, as in the header on phones.
 */
export const Triggers: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: vars.space['control-gap'] }}>
      <SearchTrigger />
      <SearchTrigger variant="icon" />
    </div>
  ),
  play: async ({ canvas }) => {
    const triggers = canvas.getAllByRole('button', { name: 'Search' });
    await expect(triggers.map((trigger) => trigger.getAttribute('aria-haspopup'))).toStrictEqual([
      'dialog',
      'dialog',
    ]);
    // The shortcut of the platform the story runs on.
    const shortcuts = triggers.map((trigger) => trigger.getAttribute('aria-keyshortcuts'));
    await expect(shortcuts).toStrictEqual(
      shortcuts[0] === 'Meta+K' ? ['Meta+K', 'Meta+K'] : ['Control+K', 'Control+K'],
    );
  },
};

/**
 * The dialog with the results of "button": each page that matches, named by its title and its
 * section, then its headings, paragraphs and table rows that match, the query highlighted.
 */
export const Results: Story = {
  render: () => <SearchTrigger />,
  play: async ({ canvas }) => {
    const field = await openSearch(canvas.getByRole('button', { name: 'Search' }));
    await userEvent.type(field, 'button');
    const results = await screen.findByRole('listbox', { name: 'Results' });
    await waitFor(async () => {
      await expect(
        within(results).getByRole('group', { name: 'Button, Essentials, Components' }),
      ).toBeVisible();
    });
    await expect(
      within(results).getByRole('group', { name: 'Dialog, Essentials, Components' }),
    ).toBeVisible();
    // The first result is highlighted, for Enter to open it.
    await expect(field).toHaveAttribute('aria-activedescendant');
  },
};

/** A query that matches nothing says so. */
export const NoResults: Story = {
  render: () => <SearchTrigger />,
  play: async ({ canvas }) => {
    const field = await openSearch(canvas.getByRole('button', { name: 'Search' }));
    await userEvent.type(field, 'xylophone');
    const dialog = screen.getByRole('dialog', { name: 'Search' });
    await expect(await within(dialog).findByText('No results for “xylophone”')).toBeVisible();
  },
};
