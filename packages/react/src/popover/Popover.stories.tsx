import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Button, createListCollection, Listbox, Popover, Portal } from '../index.ts';

const meta: Meta<typeof Popover.Root> = {
  title: 'Essentials/Popover',
  component: Popover.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** A field of the stories: a label over a text input, in the look of the page. */
function Field({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
  return (
    <label style={{ display: 'grid', gap: vars.space['control-gap'] }}>
      {label}
      <input
        defaultValue={value}
        style={{
          blockSize: vars.size['control-md'],
          paddingInline: vars.space['control-inset'],
          border: `${vars['border-width'].default} solid ${vars.color.border.default}`,
          borderRadius: vars.radius.control,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
        }}
      />
    </label>
  );
}

/** A row of actions at the end of a popover. */
const actions: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: vars.space['group-gap'],
};

/** The share popover: a title, a description, a field, an action, and the x. */
function SharePopover(props: Popover.RootProps): ReactElement {
  return (
    <Popover.Root {...props}>
      <Popover.Trigger asChild>
        <Button variant="outline">Share</Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Title>Share this page</Popover.Title>
            <Popover.Description>Anyone with the link can view it.</Popover.Description>
            <Field label="Link" value="https://contour-ui.dev/docs" />
            <div style={actions}>
              <Button size="sm">Copy link</Button>
            </div>
            <Popover.CloseTrigger />
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

/**
 * Open from the start, below its trigger at its start edge: a raised panel with the title, the
 * description, a field and an action, and the x in its corner.
 */
export const Default: Story = {
  render: () => <SharePopover defaultOpen />,
  play: async () => {
    const dialog = screen.getByRole('dialog', { name: 'Share this page' });
    await expect(dialog).toHaveClass('contour-popover__content');
    await expect(dialog).toHaveAccessibleDescription('Anyone with the link can view it.');
    await waitFor(async () => {
      await expect(dialog).toHaveAttribute('data-placement', 'bottom-start');
    });
    await expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveClass(
      'contour-popover__close-trigger',
    );
  },
};

/**
 * Open it with the trigger: focus moves to the field; Tab goes through the content and then on
 * to what follows the trigger, which closes it; Escape closes it and sends focus back.
 */
export const Interaction: Story = {
  tags: ['!visual'],
  render: () => (
    <div style={{ display: 'flex', gap: vars.space['group-gap'] }}>
      <SharePopover />
      <Button variant="ghost">Next</Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Share' });
    await userEvent.click(trigger);
    const link = screen.getByRole('textbox', { name: 'Link' });
    await waitFor(async () => {
      await expect(link).toHaveFocus();
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(trigger).toHaveFocus();
    });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    await waitFor(async () => {
      await expect(link).toHaveFocus();
    });
    await userEvent.tab();
    await userEvent.tab();
    await expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Next' })).toHaveFocus();
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  },
};

const waveforms = createListCollection({
  items: [
    { value: 'sine', label: 'Sine' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'sawtooth', label: 'Sawtooth' },
    { value: 'square', label: 'Square' },
  ],
});

/** A cell of the grid: a trigger with room below it for its open popover. */
function Cell({ children }: { readonly children: ReactNode }): ReactElement {
  return <div style={{ minBlockSize: '15rem' }}>{children}</div>;
}

/** A trigger and its popover, open from the start. */
function OpenPopover({
  trigger,
  children,
}: {
  readonly trigger: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <Popover.Root defaultOpen>
      <Popover.Trigger asChild>
        <Button variant="outline">{trigger}</Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>{children}</Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

/**
 * What popovers hold, open from the start: a note without a title (the x keeps its room), a
 * question with its actions, and a list to choose from, without padding of its own.
 */
export const Contents: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(21rem, 1fr))',
        gap: vars.space['section-gap'],
      }}
    >
      <Cell>
        <OpenPopover trigger="Saved">
          <Popover.Content aria-label="Save status">
            <Popover.Description>
              Saved two minutes ago. Changes are kept in the browser until you close the tab.
            </Popover.Description>
            <Popover.CloseTrigger />
          </Popover.Content>
        </OpenPopover>
      </Cell>
      <Cell>
        <OpenPopover trigger="Delete">
          <Popover.Content>
            <Popover.Title>Delete the take?</Popover.Title>
            <Popover.Description>It cannot be undone.</Popover.Description>
            <div style={actions}>
              <Popover.CloseTrigger asChild>
                <Button variant="outline" size="sm">
                  Cancel
                </Button>
              </Popover.CloseTrigger>
              <Button size="sm">Delete</Button>
            </div>
          </Popover.Content>
        </OpenPopover>
      </Cell>
      <Cell>
        <OpenPopover trigger="Waveform">
          <Popover.Content aria-label="Waveform">
            <Listbox.Root collection={waveforms} defaultValue={['square']}>
              <Listbox.Content aria-label="Waveform">
                {waveforms.items.map((item) => (
                  <Listbox.Item key={item.value} item={item}>
                    <Listbox.ItemText>{item.label}</Listbox.ItemText>
                    <Listbox.ItemIndicator />
                  </Listbox.Item>
                ))}
              </Listbox.Content>
            </Listbox.Root>
          </Popover.Content>
        </OpenPopover>
      </Cell>
    </div>
  ),
  play: async () => {
    await Promise.all(
      ['Save status', 'Delete the take?', 'Waveform'].map(async (name) => {
        await expect(screen.getByRole('dialog', { name })).toHaveClass('contour-popover__content');
      }),
    );
    await expect(screen.getByRole('option', { name: 'Square' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};
