import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import { Button, Drawer, Link, Portal } from '../index.ts';

const meta: Meta<typeof Drawer.Root> = {
  title: 'Kit/Drawer',
  component: Drawer.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

const SECTIONS = ['Guide', 'Kit', 'Headless', 'Audio'] as const;

/** The navigation of the docs, as a phone shows it: the menu button and the drawer it opens. */
function Navigation(props: Drawer.RootProps): ReactElement {
  return (
    <Drawer.Root {...props}>
      <Drawer.Trigger asChild>
        <Button variant="outline">Menu</Button>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Title>contour-ui</Drawer.Title>
              <Drawer.Description>Components for plugins and pages.</Drawer.Description>
            </Drawer.Header>
            <Drawer.Body>
              <nav aria-label="Sections" style={{ display: 'grid', gap: vars.space['group-gap'] }}>
                {SECTIONS.map((section) => (
                  <Link key={section} href={`#${section.toLowerCase()}`}>
                    {section}
                  </Link>
                ))}
              </nav>
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.CloseTrigger asChild>
                <Button variant="outline">Done</Button>
              </Drawer.CloseTrigger>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}

/** Wait for focus to move into the open drawer, to its x. */
async function focusedIn(): Promise<void> {
  await waitFor(async () => {
    await expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });
}

/**
 * From the start edge, the default: the navigation of a page on a phone. The menu button opens
 * it, Escape closes it, and focus goes back to the menu button.
 */
export const Start: Story = {
  render: () => <Navigation />,
  play: async ({ canvas }) => {
    const menu = canvas.getByRole('button', { name: 'Menu' });
    await userEvent.click(menu);
    await focusedIn();
    const drawer = screen.getByRole('dialog', { name: 'contour-ui' });
    await expect(drawer).toHaveAttribute('data-placement', 'start');

    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(menu).toHaveFocus();
    });
    // Open again, for the screenshot and the accessibility check.
    await userEvent.click(menu);
    await focusedIn();
  },
};

/** From the end edge. */
export const End: Story = {
  render: () => <Navigation defaultOpen placement="end" />,
  play: async () => {
    await focusedIn();
    await expect(screen.getByRole('dialog', { name: 'contour-ui' })).toHaveAttribute(
      'data-placement',
      'end',
    );
  },
};

/** From the top edge: as wide as the viewport, as high as its content. */
export const Top: Story = {
  render: () => <Navigation defaultOpen placement="top" />,
  play: focusedIn,
};

/** From the bottom edge, as a sheet. */
export const Bottom: Story = {
  render: () => <Navigation defaultOpen placement="bottom" />,
  play: focusedIn,
};

/** `size="md"`: wider from a side. `lg` is wider still, and `full` covers the viewport. */
export const Size: Story = {
  render: () => <Navigation defaultOpen size="md" />,
  play: async () => {
    await focusedIn();
    await expect(screen.getByRole('dialog', { name: 'contour-ui' })).toHaveAttribute(
      'data-size',
      'md',
    );
  },
};

/** In a right-to-left page, `start` is the right edge, and the drawer slides in from there. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <Navigation defaultOpen />
    </div>
  ),
  beforeEach: () => {
    document.documentElement.setAttribute('dir', 'rtl');
    return () => {
      document.documentElement.removeAttribute('dir');
    };
  },
  play: async () => {
    await focusedIn();
    const drawer = screen.getByRole('dialog', { name: 'contour-ui' });
    // Against the right edge once it has slid in.
    await waitFor(async () => {
      await expect(Math.round(drawer.getBoundingClientRect().right)).toBe(window.innerWidth);
    });
  },
};
