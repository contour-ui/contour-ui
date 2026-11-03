import type { dialog } from '@contour-ui/core';
import { animationsDone, expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import { StrictMode, useState } from 'react';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Dialog, Portal, useDialogContext } from '../index.ts';

/**
 * The tests' own layout, since Headless has none: a backdrop and a positioner that cover the
 * viewport, the content in the middle. The positioner lets presses through to the backdrop.
 * `.fading` runs an exit animation long enough never to end during a test.
 */
const STYLES = `
@keyframes dialog-test-out { to { opacity: 0; } }
.backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.4); }
.positioner { position: fixed; inset: 0; display: grid; place-items: center; pointer-events: none; }
.positioner[hidden] { display: none; }
.content { pointer-events: auto; padding: 16px; background: white; }
.fading[data-state='closed'] { animation: dialog-test-out 10s; }
`;

beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.append(style);
  return () => {
    style.remove();
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const openChangeSpy = () => vi.fn<(details: dialog.OpenChangeDetails) => void>();

interface SettingsProps extends Dialog.RootProps {
  /** Props of the content, such as a class for an exit animation. */
  readonly contentProps?: Dialog.ContentProps | undefined;
  /** More content, after the close trigger. */
  readonly extra?: ReactNode;
  /**
   * Whether to render the backdrop, which covers the page: a non-modal dialog has none.
   *
   * @defaultValue true
   */
  readonly backdrop?: boolean | undefined;
}

/**
 * A page with a button before and after a dialog: its trigger, and in a portal its backdrop,
 * its positioner and its content, with a title, a description, a field, a button and a close
 * trigger.
 */
function Settings({ contentProps, extra, backdrop = true, ...props }: SettingsProps): ReactElement {
  return (
    <>
      <button type="button">Before</button>
      <Dialog.Root {...props}>
        <Dialog.Trigger>Open settings</Dialog.Trigger>
        <Portal>
          {backdrop ? <Dialog.Backdrop className="backdrop" /> : null}
          <Dialog.Positioner className="positioner">
            <Dialog.Content className="content" {...contentProps}>
              <Dialog.Title>Settings</Dialog.Title>
              <Dialog.Description>Changes apply at once.</Dialog.Description>
              <label>
                Name <input />
              </label>
              <button type="button">Save</button>
              <Dialog.CloseTrigger>Close</Dialog.CloseTrigger>
              {extra}
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
      <button type="button">After</button>
    </>
  );
}

/** The element of a dialog part, which must be mounted: the first one, or the one in `root`. */
function part(name: string, root: ParentNode = document): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-scope="dialog"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No dialog ${name}.`);
  }
  return element;
}

/** Whether the element of a dialog part is mounted. */
function isMounted(name: string): boolean {
  return document.querySelector(`[data-scope="dialog"][data-part="${name}"]`) !== null;
}

/** A button of the page by its text, which works while the button is inert. */
function pageButton(text: string): HTMLButtonElement {
  for (const button of document.querySelectorAll('button')) {
    if (button.textContent === text) {
      return button;
    }
  }
  throw new Error(`No button "${text}".`);
}

/**
 * Press where the backdrop is, in a corner away from the content, as a pointer does: on what is
 * on top there. The backdrop of a dialog nested in a modal one is inert, so the press lands on
 * the page behind it, which is outside the dialog all the same.
 */
async function pressBackdrop(backdrop: HTMLElement = part('backdrop')): Promise<void> {
  await userEvent.click(backdrop, { position: { x: 4, y: 4 }, force: true });
}

/** Open the settings with a click, and wait for focus to move in. */
async function openSettings(screen: Awaited<ReturnType<typeof render>>): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Open settings' }));
  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
}

/** The settings, controlled by the state of their owner. */
function OwnedSettings(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <Settings
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
    />
  );
}

/** A part of its own: a button that closes the dialog through the context. */
function DoneButton(): ReactElement {
  const { setOpen } = useDialogContext();
  return (
    <button
      type="button"
      onClick={() => {
        setOpen(false);
      }}
    >
      Done
    </button>
  );
}

/** A dialog with a dialog opened from inside it, each in a portal. */
function Nested(props: Dialog.RootProps): ReactElement {
  return (
    <Dialog.Root {...props}>
      <Dialog.Trigger>Open project</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop className="backdrop" data-testid="outer-backdrop" />
        <Dialog.Positioner className="positioner">
          <Dialog.Content className="content">
            <Dialog.Title>Project</Dialog.Title>
            <Dialog.Root>
              <Dialog.Trigger>Delete project</Dialog.Trigger>
              <Portal>
                <Dialog.Backdrop className="backdrop" data-testid="inner-backdrop" />
                <Dialog.Positioner className="positioner">
                  <Dialog.Content className="content">
                    <Dialog.Title>Delete the project?</Dialog.Title>
                    <Dialog.CloseTrigger>Cancel</Dialog.CloseTrigger>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/** Open both nested dialogs, and wait for focus to move into the inner one. */
async function openBoth(screen: Awaited<ReturnType<typeof render>>): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Open project' }));
  await expect.element(screen.getByRole('button', { name: 'Delete project' })).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: 'Delete project' }));
  await expect.element(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
}

/** The content of a dialog by its title. */
function contentOf(title: string): HTMLElement {
  const heading = [...document.querySelectorAll('h2')].find(
    (element) => element.textContent === title,
  );
  const content = heading?.closest<HTMLElement>('[data-part="content"]');
  if (content === null || content === undefined) {
    throw new Error(`No dialog "${title}".`);
  }
  return content;
}

/** The element with a `data-testid`, which must exist. */
function byTestId(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  if (element === null) {
    throw new Error(`No [data-testid="${id}"].`);
  }
  return element;
}

/** The `--layer-index` the layer stack wrote on an element; empty when there is none. */
function layerIndex(element: HTMLElement): string {
  return element.style.getPropertyValue('--layer-index');
}

/**
 * The examples' own styles: just enough for an overlay. The backdrop and the positioner cover the
 * viewport, the positioner lets presses through to the backdrop, and the content sits in the
 * middle. Both fade in and out; the content also grows in, unless motion is reduced.
 */
const EXAMPLE_STYLES = `
@keyframes dialog-example-fade-in { from { opacity: 0; } }
@keyframes dialog-example-fade-out { to { opacity: 0; } }
@keyframes dialog-example-in { from { opacity: 0; scale: 0.96; } }
@keyframes dialog-example-out { to { opacity: 0; scale: 0.96; } }
.dialog-example-backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.4); }
.dialog-example-backdrop[data-state='open'] { animation: dialog-example-fade-in 150ms ease-out; }
.dialog-example-backdrop[data-state='closed'] { animation: dialog-example-fade-out 100ms ease-in; }
.dialog-example-positioner {
  position: fixed; inset: 0; display: grid; place-items: center; padding: 16px;
  pointer-events: none;
}
.dialog-example-positioner[hidden] { display: none; }
.dialog-example-content {
  display: flex; flex-direction: column; gap: 8px; inline-size: min(100%, 24rem);
  padding: 16px; border: 1px solid; border-radius: 8px; background: white; color: black;
  pointer-events: auto;
}
.dialog-example-content[hidden] { display: none; }
.dialog-example-content[data-state='open'] { animation: dialog-example-in 150ms ease-out; }
.dialog-example-content[data-state='closed'] { animation: dialog-example-out 100ms ease-in; }
.dialog-example-content h2, .dialog-example-content p { margin: 0; }
@media (prefers-reduced-motion: reduce) {
  .dialog-example-content[data-state='open'] { animation-name: dialog-example-fade-in; }
  .dialog-example-content[data-state='closed'] { animation-name: dialog-example-fade-out; }
}
`;

/** An example with the examples' styles. */
function withStyles(example: ReactElement): ReactElement {
  return (
    <>
      <style>{EXAMPLE_STYLES}</style>
      {example}
    </>
  );
}

interface OverlayProps {
  /** Whether to render the backdrop: a non-modal dialog has none. */
  readonly backdrop?: boolean | undefined;
  readonly children: ReactNode;
}

/** The overlay of a dialog in a portal: the backdrop, the positioner and the content. */
function Overlay({ backdrop = true, children }: OverlayProps): ReactElement {
  return (
    <Portal>
      {backdrop ? <Dialog.Backdrop className="dialog-example-backdrop" /> : null}
      <Dialog.Positioner className="dialog-example-positioner">
        <Dialog.Content className="dialog-example-content">{children}</Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  );
}

/** The content of the rename dialog: a field, and the buttons that close it. */
function RenameContent(): ReactElement {
  return (
    <>
      <Dialog.Title>Rename the track</Dialog.Title>
      <Dialog.Description>The new name shows in the mixer.</Dialog.Description>
      <label>
        Name <input defaultValue="Drums" />
      </label>
      <div>
        <Dialog.CloseTrigger>Cancel</Dialog.CloseTrigger>{' '}
        <Dialog.CloseTrigger>Save</Dialog.CloseTrigger>
      </div>
    </>
  );
}

/** The rename dialog, closed. */
function RenameDialog(props: Dialog.RootProps): ReactElement {
  return (
    <Dialog.Root {...props}>
      <Dialog.Trigger>Rename</Dialog.Trigger>
      <Overlay>
        <RenameContent />
      </Overlay>
    </Dialog.Root>
  );
}

/** A controlled dialog: the owner keeps `open` in its state and opens it from elsewhere too. */
function OwnedDialog({
  onOpenChange,
}: {
  readonly onOpenChange: (details: dialog.OpenChangeDetails) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Dialog.Root
        open={open}
        onOpenChange={(details) => {
          onOpenChange(details);
          setOpen(details.open);
        }}
      >
        <Dialog.Trigger>Rename</Dialog.Trigger>
        <Overlay>
          <RenameContent />
        </Overlay>
      </Dialog.Root>{' '}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Rename from the menu
      </button>
    </>
  );
}

/** A dialog opened from another one, each in a portal: an alert dialog inside the settings. */
function ProjectSettings(): ReactElement {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Project settings</Dialog.Trigger>
      <Overlay>
        <Dialog.Title>Project settings</Dialog.Title>
        <Dialog.Description>Sample rate, tempo and storage.</Dialog.Description>
        <Dialog.Root role="alertdialog">
          <Dialog.Trigger>Delete the project</Dialog.Trigger>
          <Overlay>
            <Dialog.Title>Delete the project?</Dialog.Title>
            <Dialog.CloseTrigger>Keep it</Dialog.CloseTrigger>
          </Overlay>
        </Dialog.Root>
        <Dialog.CloseTrigger>Done</Dialog.CloseTrigger>
      </Overlay>
    </Dialog.Root>
  );
}

describe('Dialog', () => {
  it('renders its parts with their attributes, hidden while closed', async () => {
    const screen = await render(<Settings />);
    const trigger = screen.getByRole('button', { name: 'Open settings' });
    const content = part('content');
    const title = part('title');
    const description = part('description');

    await expect.element(trigger).toHaveAttribute('type', 'button');
    await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.element(trigger).toHaveAttribute('aria-controls', content.id);
    await expect.element(trigger).toHaveAttribute('data-state', 'closed');
    expect(content).toHaveAttribute('role', 'dialog');
    expect(content).toHaveAttribute('aria-modal', 'true');
    expect(content).toHaveAttribute('aria-labelledby', title.id);
    expect(content).toHaveAttribute('aria-describedby', description.id);
    expect(content).toHaveAttribute('tabindex', '-1');
    expect(title.tagName).toBe('H2');
    expect(description.tagName).toBe('P');
    expect(part('close-trigger')).toHaveAttribute('type', 'button');
    for (const name of ['backdrop', 'positioner', 'content']) {
      expect(part(name)).toHaveAttribute('data-state', 'closed');
      expect(part(name)).toHaveAttribute('hidden');
    }
    expect(document.body).not.toHaveAttribute('style');
  });

  it('opens on a click on the trigger and moves focus to the first element inside', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(<Settings onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole('button', { name: 'Open settings' });

    await openSettings(screen);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.element(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await expect
      .element(screen.getByRole('dialog', { name: 'Settings' }))
      .toHaveAccessibleDescription('Changes apply at once.');
    for (const name of ['backdrop', 'positioner', 'content']) {
      expect(part(name)).toHaveAttribute('data-state', 'open');
      expect(part(name)).not.toHaveAttribute('hidden');
    }
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
  });

  it('keeps focus inside: Tab and Shift+Tab go round its elements', async () => {
    const screen = await render(<Settings />);
    await openSettings(screen);

    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab();
    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('closes on Escape, and focus goes back to the trigger', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(<Settings onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole('button', { name: 'Open settings' });
    await openSettings(screen);

    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveFocus();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(part('content')).toHaveAttribute('hidden');
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: false }]]);
  });

  it('stays open on Escape with closeOnEscape off', async () => {
    const screen = await render(<Settings closeOnEscape={false} />);
    await openSettings(screen);

    await userEvent.keyboard('{Escape}');
    expect(part('content')).toHaveAttribute('data-state', 'open');
  });

  it('closes on a press on the backdrop, unless closeOnInteractOutside is off', async () => {
    const screen = await render(<Settings />);
    await openSettings(screen);

    await pressBackdrop();
    await expect.element(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
    expect(part('content')).toHaveAttribute('hidden');

    await screen.rerender(<Settings closeOnInteractOutside={false} />);
    await openSettings(screen);
    await pressBackdrop();
    expect(part('content')).toHaveAttribute('data-state', 'open');
  });

  it('closes with a close trigger, unless its click handler prevents the default', async () => {
    const screen = await render(<Settings />);
    await openSettings(screen);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await expect.element(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();

    await screen.rerender(
      <Settings
        extra={
          <Dialog.CloseTrigger
            onClick={(event: MouseEvent) => {
              event.preventDefault();
            }}
          >
            Keep
          </Dialog.CloseTrigger>
        }
      />,
    );
    await openSettings(screen);
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(part('content')).toHaveAttribute('data-state', 'open');
  });

  it('keeps the page from scrolling, and the rest of it out of reach, while open', async () => {
    const screen = await render(<Settings />);
    const root = document.documentElement;
    await openSettings(screen);

    expect(getComputedStyle(root).overflowY).toBe('hidden');
    expect(pageButton('Before').closest('[inert]')).not.toBeNull();
    expect(pageButton('Open settings').closest('[inert]')).not.toBeNull();
    // A press on the backdrop lands on it.
    expect(part('backdrop').closest('[inert]')).toBeNull();
    expect(part('content').closest('[inert]')).toBeNull();

    await userEvent.keyboard('{Escape}');
    await expect.element(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
    expect(getComputedStyle(root).overflowY).not.toBe('hidden');
    expect(pageButton('Before').closest('[inert]')).toBeNull();
  });

  it('leaves the page alone when not modal, and its trigger closes it', async () => {
    const screen = await render(<Settings modal={false} backdrop={false} />);
    const trigger = screen.getByRole('button', { name: 'Open settings' });
    await openSettings(screen);

    expect(part('content')).not.toHaveAttribute('aria-modal');
    expect(getComputedStyle(document.documentElement).overflowY).not.toBe('hidden');
    expect(pageButton('Before').closest('[inert]')).toBeNull();
    // Focus may leave it, and that does not close it.
    await userEvent.click(screen.getByRole('button', { name: 'After' }));
    await expect.element(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    expect(part('content')).toHaveAttribute('data-state', 'open');

    await userEvent.click(trigger);
    expect(part('content')).toHaveAttribute('hidden');
    // The focus a press moved stays where it went.
    await expect.element(trigger).toHaveFocus();
  });

  it('only reports requests while open is controlled, and follows open', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(<Settings open={false} onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole('button', { name: 'Open settings' });

    await userEvent.click(trigger);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
    expect(part('content')).toHaveAttribute('hidden');

    await screen.rerender(<Settings open onOpenChange={onOpenChange} />);
    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: false }]]);
    expect(part('content')).toHaveAttribute('data-state', 'open');

    await screen.rerender(<Settings open={false} onOpenChange={onOpenChange} />);
    expect(part('content')).toHaveAttribute('hidden');
    await expect.element(trigger).toHaveFocus();
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it('opens and closes with the state of its owner', async () => {
    const screen = await render(<OwnedSettings />);

    await openSettings(screen);
    await userEvent.keyboard('{Escape}');
    await expect.element(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
    expect(part('content')).toHaveAttribute('hidden');
  });

  it('reports nothing when its owner opens it, and gives focus back to where it was', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(withStyles(<OwnedDialog onOpenChange={onOpenChange} />));
    const menuButton = screen.getByRole('button', { name: 'Rename from the menu' });

    await userEvent.click(menuButton);
    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    expect(onOpenChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: false }]]);
    // Back on the button the owner opened it from, not on the trigger.
    await expect.element(menuButton).toHaveFocus();
  });

  it('focuses initialFocusEl when it opens, and finalFocusEl when it closes', async () => {
    const screen = await render(
      <Settings
        initialFocusEl={() => pageButton('Save')}
        finalFocusEl={() => pageButton('After')}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    await expect.element(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.element(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('scrolls a body inside the content to the element it focuses as it opens, not the page', async () => {
    const screen = await render(
      <>
        <Settings
          initialFocusEl={() => document.querySelector<HTMLElement>('#option-49')}
          extra={
            <div data-testid="body" style={{ maxBlockSize: 120, overflowY: 'auto' }}>
              {Array.from({ length: 50 }, (_, index) => (
                <button
                  key={index}
                  id={`option-${index}`}
                  type="button"
                  style={{ display: 'block' }}
                >
                  Option {index}
                </button>
              ))}
            </div>
          }
        />
        {/* Scrolling every ancestor would scroll the page too. */}
        <div style={{ height: 3000 }} />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    const last = screen.getByRole('button', { name: 'Option 49' });
    await expect.element(last).toHaveFocus();

    const body = screen.getByTestId('body').element();
    expect(body.scrollTop).toBeGreaterThan(0);
    const box = body.getBoundingClientRect();
    const rect = last.element().getBoundingClientRect();
    expect(rect.top).toBeGreaterThanOrEqual(box.top);
    expect(rect.bottom).toBeLessThanOrEqual(box.bottom);
    expect(window.scrollY).toBe(0);
  });

  it('leaves focus where it is on close with restoreFocus off', async () => {
    const screen = await render(<Settings restoreFocus={false} />);
    await openSettings(screen);

    await userEvent.keyboard('{Escape}');
    expect(part('content')).toHaveAttribute('hidden');
    await expect.poll(() => document.activeElement).toBe(document.body);
  });

  it('focuses the first close trigger of an alert dialog, which a press outside leaves open', async () => {
    const screen = await render(<Settings role="alertdialog" />);

    await userEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(part('content')).toHaveAttribute('role', 'alertdialog');

    await pressBackdrop();
    expect(part('content')).toHaveAttribute('data-state', 'open');
    await userEvent.keyboard('{Escape}');
    expect(part('content')).toHaveAttribute('hidden');
  });

  it('starts open with defaultOpen, and focus moves in', async () => {
    const screen = await render(<Settings defaultOpen />);

    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    expect(part('content')).toHaveAttribute('data-state', 'open');
    expect(part('content')).not.toHaveAttribute('hidden');
  });

  it('mounts the overlay once it first opens with lazyMount, and unmounts it with unmountOnExit', async () => {
    const screen = await render(<Settings lazyMount unmountOnExit />);
    const trigger = screen.getByRole('button', { name: 'Open settings' });
    expect(isMounted('content')).toBe(false);
    expect(isMounted('backdrop')).toBe(false);
    await expect.element(trigger).not.toHaveAttribute('aria-controls');

    await openSettings(screen);
    await expect.element(trigger).toHaveAttribute('aria-controls', part('content').id);

    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveFocus();
    expect(isMounted('content')).toBe(false);
    expect(isMounted('positioner')).toBe(false);
    expect(isMounted('backdrop')).toBe(false);
  });

  it('keeps the content on screen, inert, while its exit animation runs', async () => {
    const onExitComplete = vi.fn<() => void>();
    const screen = await render(
      <Settings contentProps={{ className: 'content fading' }} onExitComplete={onExitComplete} />,
    );
    await openSettings(screen);

    await userEvent.keyboard('{Escape}');
    const content = part('content');
    expect(content).toHaveAttribute('data-state', 'closed');
    expect(content).not.toHaveAttribute('hidden');
    expect(content).toHaveAttribute('inert');
    expect(part('positioner')).not.toHaveAttribute('hidden');
    // Focus is not left inside a closing dialog.
    await expect.element(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
    expect(onExitComplete).not.toHaveBeenCalled();

    for (const animation of content.getAnimations()) {
      animation.finish();
    }
    await expect.poll(() => content.hasAttribute('hidden')).toBe(true);
    expect(part('positioner')).toHaveAttribute('hidden');
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('takes ids of its own for the content, the title and the description', async () => {
    const screen = await render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content id="mixer">
          <Dialog.Title id="mixer-title">Mixer</Dialog.Title>
          <Dialog.Description id="mixer-description">Eight channels.</Dialog.Description>
        </Dialog.Content>
      </Dialog.Root>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Mixer' });

    await expect.element(dialog).toHaveAttribute('id', 'mixer');
    await expect.element(dialog).toHaveAttribute('aria-labelledby', 'mixer-title');
    await expect.element(dialog).toHaveAttribute('aria-describedby', 'mixer-description');
    await expect
      .element(screen.getByRole('button', { name: 'Open' }))
      .toHaveAttribute('aria-controls', 'mixer');
  });

  it('names the content only while a title and a description are mounted', async () => {
    await render(
      <Dialog.Root defaultOpen>
        <Dialog.Content aria-label="Quick search">
          <input aria-label="Search" />
        </Dialog.Content>
      </Dialog.Root>,
    );
    const content = part('content');

    expect(content).not.toHaveAttribute('aria-labelledby');
    expect(content).not.toHaveAttribute('aria-describedby');
    expect(content).toHaveAttribute('aria-label', 'Quick search');
  });

  describe('nested', () => {
    it('closes the inner dialog first on Escape, then the outer one', async () => {
      const screen = await render(<Nested />);
      await openBoth(screen);

      await userEvent.keyboard('{Escape}');
      await expect.element(screen.getByRole('button', { name: 'Delete project' })).toHaveFocus();
      expect(contentOf('Delete the project?')).toHaveAttribute('hidden');
      expect(contentOf('Project')).toHaveAttribute('data-state', 'open');

      await userEvent.keyboard('{Escape}');
      await expect.element(screen.getByRole('button', { name: 'Open project' })).toHaveFocus();
      expect(contentOf('Project')).toHaveAttribute('hidden');
    });

    it('stacks the inner dialog above the outer one', async () => {
      const screen = await render(<Nested />);
      await openBoth(screen);

      expect(layerIndex(byTestId('outer-backdrop'))).toBe('0');
      expect(layerIndex(byTestId('inner-backdrop'))).toBe('1');
      expect(layerIndex(contentOf('Project'))).toBe('0');
      expect(layerIndex(contentOf('Delete the project?'))).toBe('1');
    });

    it('closes only the inner dialog on a press on its backdrop', async () => {
      const screen = await render(<Nested />);
      await openBoth(screen);

      await pressBackdrop(byTestId('inner-backdrop'));
      await expect.element(screen.getByRole('button', { name: 'Delete project' })).toHaveFocus();
      expect(contentOf('Project')).toHaveAttribute('data-state', 'open');
    });

    it('closes the inner dialog with the outer one', async () => {
      const screen = await render(<Nested open />);
      await expect.element(screen.getByRole('button', { name: 'Delete project' })).toHaveFocus();
      await userEvent.click(screen.getByRole('button', { name: 'Delete project' }));
      await expect.element(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

      await screen.rerender(<Nested open={false} />);
      expect(contentOf('Project')).toHaveAttribute('hidden');
      await expect.poll(() => contentOf('Delete the project?').hasAttribute('hidden')).toBe(true);
    });
  });

  it('moves focus in once in Strict Mode, open from the start', async () => {
    const screen = await render(<Settings defaultOpen />, { wrapper: StrictMode });

    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.element(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
    expect(pageButton('Before').closest('[inert]')).toBeNull();
  });

  it('leaves nothing behind when it unmounts while open', async () => {
    const screen = await render(<Settings />);
    await openSettings(screen);

    await screen.unmount();
    expect(getComputedStyle(document.documentElement).overflowY).not.toBe('hidden');
    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    expect(isMounted('content')).toBe(false);
  });

  it('toggles a non-modal dialog from its trigger rendered asChild, which is not outside it', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(
      <Dialog.Root modal={false} closeOnInteractOutside onOpenChange={onOpenChange}>
        <Dialog.Trigger asChild>
          <button type="button" className="toolbar-button">
            Inspector
          </button>
        </Dialog.Trigger>
        <Dialog.Content aria-label="Inspector">
          <button type="button">Reset</button>
        </Dialog.Content>
      </Dialog.Root>,
    );
    const trigger = screen.getByRole('button', { name: 'Inspector' });

    await userEvent.click(trigger);
    await expect.element(screen.getByRole('button', { name: 'Reset' })).toHaveFocus();
    await expect.element(trigger).toHaveClass('toolbar-button');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: false }]]);
  });

  it('gives its API to parts of its own', async () => {
    const screen = await render(<Settings extra={<DoneButton />} />);
    await openSettings(screen);

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await expect.element(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
  });

  it('throws when a part is rendered outside of a root', () => {
    expect(() => renderToStaticMarkup(<Dialog.Trigger />)).toThrow(
      'Dialog: render the parts inside <Dialog.Root>.',
    );
  });
});

describe('Dialog accessibility', () => {
  it('has no axe violations: Default', async () => {
    const screen = await render(withStyles(<RenameDialog />));
    const trigger = screen.getByRole('button', { name: 'Rename' });

    // Opened, then closed with Escape.
    await userEvent.click(trigger);
    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveFocus();
    await animationsDone();
    await expectNoAxeViolations();
  });

  it('has no axe violations: Open', async () => {
    const screen = await render(withStyles(<RenameDialog defaultOpen />));

    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await animationsDone();
    await expectNoAxeViolations();
  });

  it('has no axe violations: AlertDialog', async () => {
    const screen = await render(
      withStyles(
        <Dialog.Root role="alertdialog">
          <Dialog.Trigger>Delete the take</Dialog.Trigger>
          <Overlay>
            <Dialog.Title>Delete the take?</Dialog.Title>
            <Dialog.Description>It is gone for good.</Dialog.Description>
            <div>
              <Dialog.CloseTrigger>Keep it</Dialog.CloseTrigger>{' '}
              <Dialog.CloseTrigger>Delete</Dialog.CloseTrigger>
            </div>
          </Overlay>
        </Dialog.Root>,
      ),
    );

    // Open, and still open after a press on the backdrop.
    await userEvent.click(screen.getByRole('button', { name: 'Delete the take' }));
    await expect.element(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    await pressBackdrop();
    expect(part('content')).toHaveAttribute('data-state', 'open');
    await animationsDone();
    await expectNoAxeViolations();
  });

  it('has no axe violations: Controlled', async () => {
    const screen = await render(withStyles(<OwnedDialog onOpenChange={openChangeSpy()} />));
    const menuButton = screen.getByRole('button', { name: 'Rename from the menu' });

    // Opened by the owner, then closed with Cancel.
    await userEvent.click(menuButton);
    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect.element(menuButton).toHaveFocus();
    await animationsDone();
    await expectNoAxeViolations();
  });

  it('has no axe violations: Nested', async () => {
    const screen = await render(withStyles(<ProjectSettings />));
    const inner = screen.getByRole('button', { name: 'Delete the project' });

    // Both open, then the inner one closed with Escape.
    await userEvent.click(screen.getByRole('button', { name: 'Project settings' }));
    await expect.element(inner).toHaveFocus();
    await userEvent.click(inner);
    await expect.element(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.element(inner).toHaveFocus();
    expect(contentOf('Project settings')).toHaveAttribute('data-state', 'open');
    await animationsDone();
    await expectNoAxeViolations();
  });

  it('has no axe violations: NonModal', async () => {
    const screen = await render(
      withStyles(
        <Dialog.Root modal={false}>
          <Dialog.Trigger>Inspector</Dialog.Trigger> <button type="button">Play</button>
          <Overlay backdrop={false}>
            <Dialog.Title>Inspector</Dialog.Title>
            <Dialog.Description>Gain −3 dB, pan center.</Dialog.Description>
            <Dialog.CloseTrigger>Close</Dialog.CloseTrigger>
          </Overlay>
        </Dialog.Root>,
      ),
    );
    const trigger = screen.getByRole('button', { name: 'Inspector' });

    // Opened, focus moved out to the page, then closed by the trigger.
    await userEvent.click(trigger);
    await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await expect.element(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await animationsDone();
    await expectNoAxeViolations();
  });
});
