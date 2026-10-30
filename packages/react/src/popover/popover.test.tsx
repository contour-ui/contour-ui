import { vars } from '@contour-ui/tokens';
import { animationsDone, expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { cdp, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Button, Popover, Portal } from '../index.ts';

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

/** A length token as a number of pixels: the width of a box that long. */
function pixels(value: string): number {
  const probe = document.createElement('div');
  probe.style.width = value;
  document.body.append(probe);
  const { width } = probe.getBoundingClientRect();
  probe.remove();
  return width;
}

/** The element of a popover part, which must be mounted: the first one, or the one in `root`. */
function part(name: string, root: ParentNode = document): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-scope="popover"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No popover ${name}.`);
  }
  return element;
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

interface ShareProps extends Popover.RootProps {
  /** What the content holds after its title and description. */
  readonly body?: ReactNode;
}

/** A popover with every part: a Button as the trigger, a title, a description and the x. */
function Share({ body, ...props }: ShareProps): ReactElement {
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
            {body}
            <Popover.CloseTrigger />
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

/** Open the popover with its trigger, and wait for focus to move in, to the x. */
async function open(screen: Awaited<ReturnType<typeof render>>): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Share' }));
  await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
}

describe('Popover', () => {
  it('renders the parts of Headless with their classes', async () => {
    const screen = await render(
      <Popover.Root defaultOpen>
        <Popover.Anchor>
          <Popover.Trigger>Share</Popover.Trigger>
        </Popover.Anchor>
        <Portal>
          <Popover.Positioner>
            <Popover.Content>
              <Popover.Title>Share this page</Popover.Title>
              <Popover.Description>Anyone with the link can view it.</Popover.Description>
              <Popover.CloseTrigger />
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>,
    );
    const parts = [
      ['anchor', 'DIV', 'contour-popover__anchor'],
      ['trigger', 'BUTTON', 'contour-popover__trigger'],
      ['positioner', 'DIV', 'contour-popover__positioner'],
      ['content', 'DIV', 'contour-popover__content'],
      ['title', 'DIV', 'contour-popover__title'],
      ['description', 'DIV', 'contour-popover__description'],
    ] as const;

    for (const [name, tagName, className] of parts) {
      const element = part(name);
      expect(element.tagName).toBe(tagName);
      expect(element).toHaveClass(className, { exact: true });
    }
    await expect
      .element(screen.getByRole('dialog', { name: 'Share this page' }))
      .toHaveClass('contour-popover__content');
    // The x is a close button, the close trigger of the popover.
    const close = screen.getByRole('button', { name: 'Close' });
    await expect.element(close).toHaveClass('contour-close-button');
    await expect.element(close).toHaveClass('contour-popover__close-trigger');
    await expect.element(close).toHaveAttribute('data-part', 'close-trigger');
  });

  it('is a dialog named by its title and described by its description, below its trigger', async () => {
    const screen = await render(<Share defaultOpen />);
    const dialog = screen.getByRole('dialog', { name: 'Share this page' });

    await expect.element(dialog).toHaveAccessibleDescription('Anyone with the link can view it.');
    // At the start edge of the trigger, once it has its place.
    await expect.element(dialog).toHaveAttribute('data-placement', 'bottom-start');
  });

  it('moves focus to its first field, and closes on Escape or as Tab leaves it', async () => {
    const screen = await render(
      // On the background of the page, for the contrast that axe checks at the end.
      <div style={{ background: vars.color.bg.canvas, color: vars.color.fg.default }}>
        <Share
          body={
            <>
              <label>
                Link
                <input defaultValue="https://contour-ui.dev/docs" />
              </label>
              <Button size="sm">Copy link</Button>
            </>
          }
        />
        <Button variant="ghost">Next</Button>
      </div>,
    );
    const trigger = screen.getByRole('button', { name: 'Share' });
    const link = screen.getByRole('textbox', { name: 'Link' });

    await userEvent.click(trigger);
    await expect.element(link).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveFocus();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    await expect.element(link).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    // On to what follows the trigger, which closes the popover.
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await animationsDone();
    await expectNoAxeViolations();
  });

  it('takes the look of a Button given as its trigger', async () => {
    const screen = await render(<Share />);
    const trigger = screen.getByRole('button', { name: 'Share' });

    await expect.element(trigger).toHaveClass('contour-button');
    await expect.element(trigger).toHaveClass('contour-popover__trigger');
    await expect.element(trigger).toHaveAttribute('data-variant', 'outline');
    await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('is styled with semantic tokens', async () => {
    const screen = await render(<Share />);
    await open(screen);
    const content = part('content');

    expect(content).toHaveStyle({
      backgroundColor: color(vars.color.bg.raised),
      borderTopColor: color(vars.color.border.default),
      borderTopLeftRadius: px(vars.radius.panel),
      paddingTop: px(vars.space['panel-inset']),
      paddingLeft: px(vars.space['panel-inset']),
      rowGap: px(vars.space['group-gap']),
      color: color(vars.color.fg.default),
      boxShadow: computed('box-shadow', vars.shadow.raised),
    });
    // Read directly: `toHaveStyle` takes a border width without a border style as 0.
    expect(getComputedStyle(content).borderTopWidth).toBe(px(vars['border-width'].default));
    expect(part('title')).toHaveStyle({
      color: color(vars.color.fg.default),
      fontSize: computed('font-size', vars.text.heading.fontSize),
      fontWeight: computed('font-weight', vars.text.heading.fontWeight),
    });
    expect(part('description')).toHaveStyle({
      color: color(vars.color.fg.muted),
      fontSize: computed('font-size', vars.text.body.fontSize),
    });
  });

  it('stacks above the page with the overlay layer, a nested popover above it', async () => {
    const screen = await render(
      <Popover.Root>
        <Popover.Trigger>Settings</Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content aria-label="Settings">
              <Popover.Root>
                <Popover.Trigger>Advanced</Popover.Trigger>
                <Portal>
                  <Popover.Positioner data-testid="inner-positioner">
                    <Popover.Content aria-label="Advanced">
                      <Popover.CloseTrigger />
                    </Popover.Content>
                  </Popover.Positioner>
                </Portal>
              </Popover.Root>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>,
    );
    const layer = Number(computed('z-index', vars.layer.overlay));

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await expect.element(screen.getByRole('button', { name: 'Advanced' })).toHaveFocus();
    expect(getComputedStyle(part('positioner')).zIndex).toBe(String(layer));

    await userEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await expect
      .element(screen.getByTestId('inner-positioner'))
      .toHaveStyle({ zIndex: String(layer + 1) });
  });

  it('puts the x in the top end corner, beside the title, and closes with it', async () => {
    const screen = await render(<Share />);
    await open(screen);
    finishAnimations(part('content'));
    const close = screen.getByRole('button', { name: 'Close' });
    const content = part('content').getBoundingClientRect();

    await expect.element(close).toHaveStyle({ position: 'absolute' });
    const box = close.element().getBoundingClientRect();
    // From the inside of the border.
    expect(content.right - box.right).toBeCloseTo(
      pixels(vars.space['group-gap']) + pixels(vars['border-width'].default),
    );
    expect(box.top - content.top).toBeLessThan(pixels(vars.space['panel-inset']));
    // The title makes room for it: its text ends before the x.
    const text = document.createRange();
    text.selectNodeContents(part('title'));
    expect(text.getBoundingClientRect().right).toBeLessThanOrEqual(box.left);

    await userEvent.click(close);
    await expect.element(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
    await expect.poll(() => part('content').hidden).toBe(true);
  });

  it('makes room for the x beside a description when there is no title', async () => {
    const screen = await render(
      <Popover.Root defaultOpen>
        <Popover.Trigger>Info</Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content aria-label="Info">
              <Popover.Description>Saved two minutes ago.</Popover.Description>
              <Popover.CloseTrigger />
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>,
    );

    await expect
      .element(screen.getByRole('dialog', { name: 'Info' }))
      .toHaveClass('contour-popover__content');
    expect(part('description')).toHaveStyle({
      paddingRight: `${pixels(vars.size['control-sm']) + pixels(vars.space['control-gap'])}px`,
    });
  });

  it('closes from a button of its own with asChild, which keeps its look and place', async () => {
    const screen = await render(
      <Share
        body={
          <Popover.CloseTrigger asChild>
            <Button>Done</Button>
          </Popover.CloseTrigger>
        }
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));
    const done = screen.getByRole('button', { name: 'Done' });
    // Before the x in the content: focus moves to it first.
    await expect.element(done).toHaveFocus();

    await expect.element(done).toHaveClass('contour-button', { exact: true });
    await expect.element(done).toHaveAttribute('data-part', 'close-trigger');
    await expect.element(done).not.toHaveStyle({ position: 'absolute' });

    await userEvent.click(done);
    await expect.element(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
  });

  it('is as wide as its content up to 320px, or as wide as a wider trigger with sameWidth', async () => {
    const text = 'A description long enough to wrap, since it would run much wider than the cap.';
    const screen = await render(<Share defaultOpen body={<p>{text}</p>} />);
    finishAnimations(part('content'));
    await expect.poll(() => part('content').getBoundingClientRect().width).toBe(320);
    await screen.unmount();

    await render(
      <Popover.Root defaultOpen positioning={{ sameWidth: true }}>
        <Popover.Trigger style={{ inlineSize: 360 }}>Wide</Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content aria-label="Wide">{text}</Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>,
    );
    finishAnimations(part('content'));
    await expect.poll(() => part('content').getBoundingClientRect().width).toBe(360);
  });

  it('scrolls when its content is higher than the room it has', async () => {
    const lines = Array.from({ length: 80 }, (_, index) => <p key={index}>{`Line ${index}`}</p>);
    await render(<Share defaultOpen body={lines} />);
    finishAnimations(part('content'));
    const content = part('content');

    await expect.poll(() => content.scrollHeight > content.clientHeight).toBe(true);
    expect(getComputedStyle(content).overflowY).toBe('auto');
    expect(content.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
  });

  it('grows in and shrinks out, and only fades when the user prefers reduced motion', async () => {
    const screen = await render(<Share />);
    await open(screen);
    expect(getComputedStyle(part('content')).animationName).toBe('contour-popover-in');
    expect(getComputedStyle(part('content')).transformOrigin).not.toBe('');

    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await expect
      .poll(() => getComputedStyle(part('content')).animationName)
      .toBe('contour-popover-fade-in');

    await userEvent.keyboard('{Escape}');
    expect(getComputedStyle(part('content')).animationName).toBe('contour-popover-fade-out');
    await cdp().send('Emulation.setEmulatedMedia', { features: [] });

    await open(screen);
    await userEvent.keyboard('{Escape}');
    expect(getComputedStyle(part('content')).animationName).toBe('contour-popover-out');
    // Hidden once the exit animation ends.
    await expect.poll(() => getComputedStyle(part('content')).display).toBe('none');
  });
});
