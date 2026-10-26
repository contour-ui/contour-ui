import type { popover } from '@contour-ui/core';
import { useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Popover, Portal, usePopoverContext } from '../index.ts';
import { nextFrame } from '../platform/dom.test-utils.ts';

const OFF_SCREEN = 'translate(0px, calc(-100% - 100vh))';

const openChangeSpy = () => vi.fn<(details: popover.OpenChangeDetails) => void>();

/** The element of a popover part in the document: the first one, or the one inside `within`. */
function part(name: string, within: ParentNode = document): HTMLElement {
  const element = within.querySelector<HTMLElement>(`[data-scope="popover"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No popover ${name}.`);
  }
  return element;
}

/** Whether the document has a popover part. */
const hasPart = (name: string): boolean =>
  document.querySelector(`[data-scope="popover"][data-part="${name}"]`) !== null;

/** A share popover between two buttons: a title, a description, a field and a close trigger. */
function Share({
  children,
  ...props
}: Popover.RootProps & { readonly children?: ReactNode }): ReactElement {
  return (
    <>
      <button type="button">Before</button>
      <Popover.Root {...props}>
        <Popover.Trigger>Share</Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content>
              <Popover.Title>Share this page</Popover.Title>
              <Popover.Description>Anyone with the link can view it.</Popover.Description>
              <input aria-label="Link" defaultValue="https://contour-ui.dev" />
              <Popover.CloseTrigger>Done</Popover.CloseTrigger>
              {children}
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
      <button type="button">After</button>
      <input aria-label="Search" />
    </>
  );
}

/** Open the popover with its trigger, and wait until focus has moved in. */
async function openShare(screen: Awaited<ReturnType<typeof render>>): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Share' }));
  await expect.element(screen.getByRole('textbox', { name: 'Link' })).toHaveFocus();
}

/** A popover with another one inside, whose owner can close the outer one from outside. */
function Nested(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Popover.Root
        open={open}
        onOpenChange={(details) => {
          setOpen(details.open);
        }}
      >
        <Popover.Trigger>Settings</Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content aria-label="Settings">
              <Popover.Root>
                <Popover.Trigger>Advanced</Popover.Trigger>
                <Portal>
                  <Popover.Positioner>
                    <Popover.Content aria-label="Advanced">
                      <button type="button">Reset</button>
                    </Popover.Content>
                  </Popover.Positioner>
                </Portal>
              </Popover.Root>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
        }}
      >
        Close settings
      </button>
    </>
  );
}

/** A popover with `initialFocusEl` and `finalFocusEl`, and a field after it. */
function Focused({ restoreFocus }: { readonly restoreFocus: boolean }): ReactElement {
  const doneRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Popover.Root
        restoreFocus={restoreFocus}
        initialFocusEl={() => doneRef.current}
        finalFocusEl={() => searchRef.current}
      >
        <Popover.Trigger>Share</Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content aria-label="Share">
              <input aria-label="Link" />
              <Popover.CloseTrigger ref={doneRef}>Done</Popover.CloseTrigger>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
      <input ref={searchRef} aria-label="Search" />
    </>
  );
}

/** A part of the owner's that shows whether the popover is open. */
function OpenState(): ReactElement {
  const api = usePopoverContext();
  return <output>{api.open ? 'Open' : 'Closed'}</output>;
}

describe('Popover', () => {
  it('renders a trigger that opens a dialog, and a closed content, hidden and portalled', async () => {
    const screen = await render(<Share />);
    const trigger = screen.getByRole('button', { name: 'Share' });

    await expect.element(trigger).toHaveAttribute('type', 'button');
    await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.element(trigger).toHaveAttribute('data-state', 'closed');

    const positioner = part('positioner');
    const content = part('content');
    // Mounted while closed: the trigger points to it.
    await expect.element(trigger).toHaveAttribute('aria-controls', content.id);
    expect(positioner.parentElement).toBe(document.body);
    expect(positioner).toHaveAttribute('hidden');
    expect(positioner).toHaveAttribute('data-state', 'closed');
    expect(positioner.style.transform).toBe(OFF_SCREEN);
    expect(content).toHaveAttribute('hidden');
    expect(content).toHaveAttribute('data-state', 'closed');
    expect(content).toHaveAttribute('data-placement', 'bottom-start');
    expect(content).toHaveAttribute('role', 'dialog');
    expect(content).toHaveAttribute('tabindex', '-1');
    expect(content).not.toHaveAttribute('aria-modal');
    for (const name of ['trigger', 'positioner', 'content', 'title', 'description']) {
      expect(part(name)).toHaveAttribute('data-scope', 'popover');
    }
    expect(part('close-trigger')).toHaveAttribute('type', 'button');
  });

  it('opens on click, places the content, and moves focus into it', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(<Share onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole('button', { name: 'Share' });

    await openShare(screen);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.element(trigger).toHaveAttribute('data-state', 'open');
    const dialog = screen.getByRole('dialog', { name: 'Share this page' });
    await expect.element(dialog).toHaveAccessibleDescription('Anyone with the link can view it.');
    await expect.element(dialog).toHaveAttribute('data-state', 'open');
    await expect.element(trigger).toHaveAttribute('aria-controls', dialog.element().id);

    // Below the trigger, lined up with its start edge, 8px away.
    const positioner = part('positioner');
    await expect.poll(() => positioner.style.transform).not.toBe(OFF_SCREEN);
    expect(positioner).toHaveAttribute('data-placement', 'bottom-start');
    expect(dialog.element()).toHaveAttribute('data-placement', 'bottom-start');
    const triggerBox = trigger.element().getBoundingClientRect();
    const box = positioner.getBoundingClientRect();
    expect(box.left).toBeCloseTo(triggerBox.left, 0);
    expect(box.top).toBeCloseTo(triggerBox.bottom + 8, 0);
    expect(positioner.style.getPropertyValue('--layer-index')).toBe('0');
  });

  it('closes on Escape and moves focus back to the trigger', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(<Share onOpenChange={onOpenChange} />);
    await openShare(screen);

    await userEvent.keyboard('{Escape}');
    await expect.element(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
    expect(part('content')).toHaveAttribute('hidden');
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: false }]]);
  });

  it('closes on a press outside, and leaves focus on a field pressed outside', async () => {
    const screen = await render(<Share />);
    await openShare(screen);

    const search = screen.getByRole('textbox', { name: 'Search' });
    await userEvent.click(search);
    await expect.element(search).toHaveFocus();
    expect(part('content')).toHaveAttribute('hidden');
    // On the frame focus would go back: it stays on the field.
    await nextFrame();
    await nextFrame();
    await expect.element(search).toHaveFocus();
  });

  it('closes when its trigger or its close trigger is pressed', async () => {
    const screen = await render(<Share />);
    const trigger = screen.getByRole('button', { name: 'Share' });

    await openShare(screen);
    // The trigger is not outside: its press does not close the popover before its click does.
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');

    await openShare(screen);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.element(trigger).toHaveFocus();
  });

  it('stays open on Escape and on a press outside when its props say so', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(
      <Share closeOnEscape={false} closeOnInteractOutside={false} onOpenChange={onOpenChange} />,
    );
    await openShare(screen);

    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'After' }));
    await expect.element(screen.getByRole('dialog')).toBeVisible();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('only reports requests while `open` is controlled, and follows its owner', async () => {
    const onOpenChange = openChangeSpy();
    function Controlled(): ReactElement {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Share
            open={open}
            onOpenChange={(details) => {
              onOpenChange(details);
              setOpen(details.open);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Open from outside
          </button>
        </>
      );
    }
    const screen = await render(<Controlled />);

    await openShare(screen);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
    await userEvent.keyboard('{Escape}');
    await expect.element(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: false }]]);

    // The owner opens it on its own: the popover follows, without a report.
    await userEvent.click(screen.getByRole('button', { name: 'Open from outside' }));
    await expect.element(screen.getByRole('dialog')).toBeVisible();
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it('stays closed while the owner of a controlled popover keeps it so', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(<Share open={false} onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole('button', { name: 'Share' });

    await userEvent.click(trigger);
    await userEvent.click(trigger);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: true }]]);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(part('content')).toHaveAttribute('hidden');
  });

  it('keeps the portalled content in the Tab order right after the trigger', async () => {
    const screen = await render(<Share />);
    const trigger = screen.getByRole('button', { name: 'Share' });
    const link = screen.getByRole('textbox', { name: 'Link' });
    await openShare(screen);

    await userEvent.tab({ shift: true });
    await expect.element(trigger).toHaveFocus();
    // The trigger is not outside: the popover stays open.
    await expect.element(screen.getByRole('dialog')).toBeVisible();
    await userEvent.tab();
    await expect.element(link).toHaveFocus();
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Done' })).toHaveFocus();

    // Past the end of the content: on to what follows the trigger, which closes the popover.
    await userEvent.tab();
    const after = screen.getByRole('button', { name: 'After' });
    await expect.element(after).toHaveFocus();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await nextFrame();
    await nextFrame();
    await expect.element(after).toHaveFocus();
  });

  it('traps focus, hides the rest of the page and locks the scroll when modal', async () => {
    const screen = await render(<Share modal />);
    const trigger = screen.getByRole('button', { name: 'Share' });
    await openShare(screen);

    const dialog = screen.getByRole('dialog');
    await expect.element(dialog).toHaveAttribute('aria-modal', 'true');
    const before = screen.getByRole('button', { name: 'Before' }).element();
    await expect.poll(() => before.closest('[inert]')).not.toBeNull();
    // The trigger stays reachable, so that it closes the popover.
    expect(trigger.element().closest('[inert]')).toBeNull();
    expect(getComputedStyle(document.documentElement).overflowY).toBe('hidden');

    // Tab goes round the content.
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Done' })).toHaveFocus();
    await userEvent.tab();
    await expect.element(screen.getByRole('textbox', { name: 'Link' })).toHaveFocus();

    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(before.closest('[inert]')).toBeNull();
    expect(getComputedStyle(document.documentElement).overflowY).not.toBe('hidden');
  });

  it('closes the top-most of nested popovers first, and the inner one with the outer one', async () => {
    const screen = await render(<Nested />);
    const settings = screen.getByRole('dialog', { name: 'Settings', includeHidden: true });
    const advanced = screen.getByRole('dialog', { name: 'Advanced', includeHidden: true });

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await expect.element(settings).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    await expect.element(screen.getByRole('button', { name: 'Reset' })).toHaveFocus();

    // A press inside the inner popover, portalled out of the outer one, keeps both open.
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await expect.element(advanced).toBeVisible();
    await expect.element(settings).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await expect.element(advanced).not.toBeVisible();
    await expect.element(settings).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Advanced' })).toHaveFocus();

    // Opened again, it closes with the outer one, even when its owner closes that one.
    await userEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    await expect.element(advanced).toBeVisible();
    // A click without a press: the owner closes the outer popover, nothing is pressed outside.
    screen
      .getByRole('button', { name: 'Close settings' })
      .element()
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect.element(settings).not.toBeVisible();
    await expect.element(advanced).not.toBeVisible();
  });

  it('mounts the content on the first opening with lazyMount, and unmounts it with unmountOnExit', async () => {
    const lazy = await render(<Share lazyMount />);
    expect(hasPart('content')).toBe(false);
    expect(hasPart('positioner')).toBe(false);
    await expect
      .element(lazy.getByRole('button', { name: 'Share' }))
      .not.toHaveAttribute('aria-controls');
    await openShare(lazy);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => part('content').hidden).toBe(true);
    await lazy.unmount();

    const unmounting = await render(<Share unmountOnExit />);
    expect(part('content')).toHaveAttribute('hidden');
    await openShare(unmounting);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => hasPart('content')).toBe(false);
    expect(hasPart('positioner')).toBe(false);
  });

  it('points to its title and its description only while they are mounted', async () => {
    const screen = await render(
      <Popover.Root defaultOpen>
        <Popover.Trigger>Info</Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content aria-label="Info">
            <Popover.Description id="info-text">Saved two minutes ago.</Popover.Description>
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Root>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Info' });

    await expect.element(dialog).not.toHaveAttribute('aria-labelledby');
    // An id of the owner's: the content follows it.
    await expect.element(dialog).toHaveAttribute('aria-describedby', 'info-text');
  });

  it('leaves focus alone when it starts open, and when autoFocus is off', async () => {
    const screen = await render(<Share defaultOpen />);
    await expect.element(screen.getByRole('dialog')).toBeVisible();
    await nextFrame();
    await nextFrame();
    expect(document.activeElement).toBe(document.body);
    await screen.unmount();

    const manual = await render(<Share autoFocus={false} />);
    const trigger = manual.getByRole('button', { name: 'Share' });
    await userEvent.click(trigger);
    await expect.element(manual.getByRole('dialog')).toBeVisible();
    await nextFrame();
    await nextFrame();
    await expect.element(trigger).toHaveFocus();
  });

  it('leaves nothing waiting for its content when it unmounts before its first frame', async () => {
    // `whenRendered` is the only module that observes the document: every observer it starts
    // while an element is missing must be disconnected again.
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const onOpenChange = openChangeSpy();
    const screen = await render(<Share onOpenChange={onOpenChange} />);

    // Opened and unmounted in one task: the move of focus into the content never gets its frame.
    screen
      .getByRole('button', { name: 'Share' })
      .element()
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
    await screen.unmount();
    await nextFrame();
    await nextFrame();

    expect(observe.mock.calls.length).toBe(disconnect.mock.calls.length);
    expect(document.activeElement).toBe(document.body);
    observe.mockRestore();
    disconnect.mockRestore();
  });

  it('moves focus to initialFocusEl and back to finalFocusEl, or nowhere without restoreFocus', async () => {
    const screen = await render(<Focused restoreFocus />);
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));
    await expect.element(screen.getByRole('button', { name: 'Done' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.element(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
    await screen.unmount();

    const without = await render(<Focused restoreFocus={false} />);
    await userEvent.click(without.getByRole('button', { name: 'Share' }));
    await expect.element(without.getByRole('button', { name: 'Done' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await nextFrame();
    await nextFrame();
    await expect.element(without.getByRole('textbox', { name: 'Search' })).not.toHaveFocus();
    await expect.element(without.getByRole('button', { name: 'Share' })).not.toHaveFocus();
  });

  it('places the content next to the anchor, and in place without portalled', async () => {
    const screen = await render(
      <Popover.Root defaultOpen portalled={false} positioning={{ placement: 'top-end' }}>
        <div style={{ paddingBlockStart: 200 }}>
          <Popover.Anchor style={{ display: 'flex', inlineSize: 300 }}>
            <input aria-label="Color" />
            <Popover.Trigger>Pick</Popover.Trigger>
          </Popover.Anchor>
        </div>
        <Popover.Positioner>
          <Popover.Content aria-label="Colors">Swatches</Popover.Content>
        </Popover.Positioner>
      </Popover.Root>,
    );
    const positioner = part('positioner');
    expect(positioner.parentElement).toBe(screen.container);

    await expect.poll(() => positioner.style.transform).not.toBe(OFF_SCREEN);
    expect(positioner.style.getPropertyValue('--reference-width')).toBe('300px');
    const anchor = part('anchor').getBoundingClientRect();
    const box = positioner.getBoundingClientRect();
    expect(box.right).toBeCloseTo(anchor.right, 0);
    expect(box.bottom).toBeCloseTo(anchor.top - 8, 0);
    await expect.element(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'top-end');
  });

  it('gives its API to parts of your own', async () => {
    const screen = await render(
      <Popover.Root>
        <Popover.Trigger>Share</Popover.Trigger>
        <OpenState />
      </Popover.Root>,
    );

    await expect.element(screen.getByText('Closed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));
    await expect.element(screen.getByText('Open')).toBeInTheDocument();
    expect(() => renderToStaticMarkup(<OpenState />)).toThrow('Popover.Root');
  });

  it('renders on the server without the portalled content', () => {
    const html = renderToStaticMarkup(<Share defaultOpen />);
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).not.toContain('role="dialog"');

    const inPlace = renderToStaticMarkup(
      <Popover.Root defaultOpen portalled={false}>
        <Popover.Trigger>Share</Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content aria-label="Share">Link</Popover.Content>
        </Popover.Positioner>
      </Popover.Root>,
    );
    expect(inPlace).toContain('role="dialog"');
  });
});
