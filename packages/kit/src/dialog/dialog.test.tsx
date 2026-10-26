import { vars } from '@contour-ui/tokens';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { cdp, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Button, Dialog, Portal } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** A length token in pixels, as the browser computes it. */
const px = (value: string): string => computed('padding-top', value);

/** A color token as the browser computes it. */
const color = (value: string): string => computed('color', value);

/** The element of a dialog part, which must be mounted: the first one, or the one in `root`. */
function part(name: string, root: ParentNode = document): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-scope="dialog"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No dialog ${name}.`);
  }
  return element;
}

/** The vertical middle of an element in the viewport. */
function middle(element: HTMLElement): number {
  const box = element.getBoundingClientRect();
  return box.top + box.height / 2;
}

/** A length token as a number of pixels: the width of a box that long. */
function pixels(value: string): number {
  const probe = document.createElement('div');
  probe.style.width = value;
  document.body.append(probe);
  const { width } = probe.getBoundingClientRect();
  probe.remove();
  return width;
}

/** End the animations of an element, as time would: its box is then the one it rests in. */
function finishAnimations(element: Element): void {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
}

afterEach(async () => {
  await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

interface ExportProps extends Dialog.RootProps {
  /** The content of the body. */
  readonly body?: ReactNode;
}

/** A dialog with every part: the x, a header, a body and a footer with a cancel button. */
function Export({ body = 'Render the mix to a file.', ...props }: ExportProps): ReactElement {
  return (
    <Dialog.Root {...props}>
      <Dialog.Trigger asChild>
        <Button>Export</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.CloseTrigger />
            <Dialog.Header>
              <Dialog.Title>Export the mix</Dialog.Title>
              <Dialog.Description>WAV, 48 kHz.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>{body}</Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.CloseTrigger>
              <Button>Export</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/** Open the dialog with its trigger, and wait for focus to move in, to the x. */
async function open(screen: Awaited<ReturnType<typeof render>>): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Export' }));
  await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
}

describe('Dialog', () => {
  it('renders the parts of Headless with their classes, the placement and the size', async () => {
    await render(<Export defaultOpen />);
    const parts = [
      ['backdrop', 'contour-dialog__backdrop'],
      ['positioner', 'contour-dialog__positioner'],
      ['content', 'contour-dialog__content'],
      ['header', 'contour-dialog__header'],
      ['body', 'contour-dialog__body'],
      ['footer', 'contour-dialog__footer'],
      ['title', 'contour-dialog__title'],
      ['description', 'contour-dialog__description'],
    ] as const;

    for (const [name, className] of parts) {
      expect(part(name)).toHaveClass(className, { exact: true });
    }
    expect(part('trigger')).toHaveClass('contour-button contour-dialog__trigger', { exact: true });
    // The defaults are rendered too, so CSS can select them.
    expect(part('positioner')).toHaveAttribute('data-placement', 'center');
    expect(part('content')).toHaveAttribute('data-placement', 'center');
    expect(part('content')).toHaveAttribute('data-size', 'md');
    expect(part('title').tagName).toBe('H2');
  });

  it('is styled with semantic tokens', async () => {
    const screen = await render(<Export />);
    await open(screen);
    const content = part('content');

    expect(content).toHaveStyle({
      backgroundColor: color(vars.color.bg.raised),
      borderTopColor: color(vars.color.border.default),
      borderTopStyle: 'solid',
      borderTopWidth: px(vars['border-width'].default),
      borderTopLeftRadius: px(vars.radius.panel),
      boxShadow: computed('box-shadow', vars.shadow.overlay),
      paddingTop: px(vars.space['panel-inset']),
      rowGap: px(vars.space['panel-inset']),
      color: color(vars.color.fg.default),
      fontSize: computed('font-size', vars.text.body.fontSize),
    });
    expect(part('backdrop')).toHaveStyle({
      position: 'fixed',
      backgroundColor: computed('background-color', vars.color.overlay.scrim),
    });
    expect(part('title')).toHaveStyle({
      marginTop: '0px',
      color: color(vars.color.fg.default),
      fontSize: computed('font-size', vars.text.heading.fontSize),
      fontWeight: computed('font-weight', vars.text.heading.fontWeight),
    });
    expect(part('description')).toHaveStyle({
      marginTop: '0px',
      color: color(vars.color.fg.muted),
    });
  });

  it('stacks above the page with the overlay layer, a nested dialog above it', async () => {
    const screen = await render(
      <Dialog.Root>
        <Dialog.Trigger>Project</Dialog.Trigger>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content aria-label="Project">
              <Dialog.Root>
                <Dialog.Trigger>Delete</Dialog.Trigger>
                <Portal>
                  <Dialog.Backdrop data-testid="inner-backdrop" />
                  <Dialog.Positioner data-testid="inner-positioner">
                    <Dialog.Content aria-label="Delete">
                      <Dialog.CloseTrigger />
                    </Dialog.Content>
                  </Dialog.Positioner>
                </Portal>
              </Dialog.Root>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>,
    );
    const layer = Number(computed('z-index', vars.layer.overlay));

    await userEvent.click(screen.getByRole('button', { name: 'Project' }));
    await expect.element(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    expect(getComputedStyle(part('positioner')).zIndex).toBe(String(layer));
    expect(getComputedStyle(part('backdrop')).zIndex).toBe(String(layer));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await expect
      .element(screen.getByTestId('inner-positioner'))
      .toHaveStyle({ zIndex: String(layer + 1) });
    await expect
      .element(screen.getByTestId('inner-backdrop'))
      .toHaveStyle({ zIndex: String(layer + 1) });
  });

  it('grows as wide as its size allows, never wider than the viewport', async () => {
    const screen = await render(<Export defaultOpen modal={false} size="sm" />);
    expect(part('content')).toHaveStyle({ maxWidth: '400px' });

    await screen.rerender(<Export defaultOpen modal={false} size="lg" />);
    expect(part('content')).toHaveStyle({ maxWidth: '800px' });
    await screen.rerender(<Export defaultOpen modal={false} size="md" />);
    expect(part('content')).toHaveStyle({ maxWidth: '560px' });
    const box = part('content').getBoundingClientRect();
    expect(box.width).toBeLessThanOrEqual(window.innerWidth);
  });

  it('sits in the middle of the viewport, or near its top', async () => {
    const screen = await render(<Export defaultOpen />);
    finishAnimations(part('content'));
    expect(middle(part('content'))).toBeCloseTo(window.innerHeight / 2, 0);

    await screen.rerender(<Export defaultOpen placement="top" />);
    finishAnimations(part('content'));
    expect(part('positioner')).toHaveAttribute('data-placement', 'top');
    expect(part('positioner')).toHaveStyle({ alignItems: 'flex-start' });
    expect(part('content').getBoundingClientRect().top).toBeLessThan(window.innerHeight / 4);
  });

  it('puts the x in the top end corner, beside the header, and closes with it', async () => {
    const screen = await render(<Export />);
    await open(screen);
    finishAnimations(part('content'));
    const close = screen.getByRole('button', { name: 'Close' });
    const content = part('content').getBoundingClientRect();
    const header = part('header');

    await expect.element(close).toHaveClass('contour-close-button');
    await expect.element(close).toHaveClass('contour-dialog__close-trigger');
    await expect.element(close).toHaveStyle({ position: 'absolute' });
    const box = close.element().getBoundingClientRect();
    // From the inside of the border.
    expect(content.right - box.right).toBeCloseTo(
      pixels(vars.space['group-gap']) + pixels(vars['border-width'].default),
    );
    expect(box.top - content.top).toBeLessThan(pixels(vars.space['panel-inset']));
    // The header makes room for it: the title, as wide as the header's content, ends before it.
    expect(part('title', header).getBoundingClientRect().right).toBeLessThanOrEqual(box.left);

    await userEvent.click(close);
    await expect.element(screen.getByRole('button', { name: 'Export' })).toHaveFocus();
    expect(part('content')).toHaveAttribute('hidden');
  });

  it('closes from a button of its own with asChild, which keeps its look and place', async () => {
    const screen = await render(<Export />);
    await open(screen);
    const cancel = screen.getByRole('button', { name: 'Cancel' });

    await expect.element(cancel).toHaveClass('contour-button', { exact: true });
    await expect.element(cancel).toHaveAttribute('data-part', 'close-trigger');
    await expect.element(cancel).not.toHaveStyle({ position: 'absolute' });
    expect(cancel.element().parentElement).toBe(part('footer'));

    await userEvent.click(cancel);
    await expect.element(screen.getByRole('button', { name: 'Export' })).toHaveFocus();
  });

  it('lays out the footer in a row at the end', async () => {
    await render(<Export defaultOpen />);
    const footer = part('footer');

    expect(footer).toHaveStyle({ display: 'flex', justifyContent: 'flex-end' });
    expect(footer).toHaveStyle({ columnGap: px(vars.space['group-gap']) });
  });

  it('hides a header, a body or a footer with `hidden`, though each sets its display', async () => {
    await render(
      <Dialog.Root defaultOpen>
        <Portal>
          <Dialog.Positioner>
            <Dialog.Content aria-label="Export the mix">
              <Dialog.Header hidden />
              <Dialog.Body hidden />
              <Dialog.Footer hidden />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>,
    );

    const names = ['header', 'body', 'footer'];

    expect(names.map((name) => [name, getComputedStyle(part(name)).display])).toStrictEqual(
      names.map((name) => [name, 'none']),
    );
  });

  it('scrolls a long body between the header and the footer, which stay in view', async () => {
    const lines = Array.from({ length: 80 }, (_, index) => <p key={index}>{`Line ${index}`}</p>);
    await render(<Export defaultOpen body={lines} />);
    finishAnimations(part('content'));
    const body = part('body');

    await expect.poll(() => body.scrollHeight > body.clientHeight).toBe(true);
    expect(getComputedStyle(body).overflowY).toBe('auto');
    expect(part('footer').getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    expect(part('header').getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    // From edge to edge of the content, its scrollbar too.
    const content = part('content').getBoundingClientRect();
    expect(body.getBoundingClientRect().left).toBeCloseTo(
      content.left + pixels(vars['border-width'].default),
      0,
    );
  });

  it('grows in and fades out, and only fades when the user prefers reduced motion', async () => {
    const screen = await render(<Export />);
    await open(screen);
    expect(getComputedStyle(part('content')).animationName).toBe('contour-dialog-in');
    expect(getComputedStyle(part('backdrop')).animationName).toBe('contour-dialog-fade-in');

    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await expect
      .poll(() => getComputedStyle(part('content')).animationName)
      .toBe('contour-dialog-fade-in');

    await userEvent.keyboard('{Escape}');
    expect(getComputedStyle(part('content')).animationName).toBe('contour-dialog-fade-out');
    expect(getComputedStyle(part('backdrop')).animationName).toBe('contour-dialog-fade-out');
  });
});
