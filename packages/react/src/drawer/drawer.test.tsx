import { vars } from '@contour-ui/tokens';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { cdp, page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Button, Drawer, Portal } from '../index.ts';

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

/** A length token as a number of pixels: the width of a box that long. */
function pixels(value: string): number {
  const probe = document.createElement('div');
  probe.style.width = value;
  document.body.append(probe);
  const { width } = probe.getBoundingClientRect();
  probe.remove();
  return width;
}

/** A color token as the browser computes it. */
const color = (value: string): string => computed('color', value);

/** The element of a dialog part of the drawer, which must be mounted. */
function part(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-scope="dialog"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No drawer ${name}.`);
  }
  return element;
}

/** The border widths of an element: left, top, right, bottom. */
function borderWidths(element: Element): string[] {
  const style = getComputedStyle(element);
  return [
    style.borderLeftWidth,
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
  ];
}

/** The content of the drawer, at rest: its animation ended, as time would end it. */
function restingContent(): HTMLElement {
  const content = part('content');
  for (const animation of content.getAnimations()) {
    animation.finish();
  }
  return content;
}

afterEach(async () => {
  document.documentElement.removeAttribute('dir');
  await cdp().send('Emulation.setEmulatedMedia', { features: [] });
  // The default viewport of the browser tests.
  await page.viewport(414, 896);
});

/** A navigation drawer with a menu button, the x, a header, links and a footer. */
function Navigation(props: Drawer.RootProps): ReactElement {
  return (
    <Drawer.Root {...props}>
      <Drawer.Trigger asChild>
        <Button variant="ghost">Menu</Button>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Title>Menu</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>
              <a href="#guide">Guide</a>
              <a href="#essentials">Essentials</a>
            </Drawer.Body>
            <Drawer.Footer>Version 1.0</Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}

describe('Drawer', () => {
  it('renders the parts of Headless Dialog with their classes, the placement and the size', async () => {
    await render(<Navigation defaultOpen />);
    const parts = [
      ['backdrop', 'contour-drawer__backdrop'],
      ['positioner', 'contour-drawer__positioner'],
      ['content', 'contour-drawer__content'],
      ['header', 'contour-drawer__header'],
      ['body', 'contour-drawer__body'],
      ['footer', 'contour-drawer__footer'],
      ['title', 'contour-drawer__title'],
    ] as const;

    for (const [name, className] of parts) {
      expect(part(name)).toHaveClass(className, { exact: true });
    }
    expect(part('content')).toHaveAttribute('role', 'dialog');
    expect(part('positioner')).toHaveAttribute('data-placement', 'start');
    expect(part('content')).toHaveAttribute('data-placement', 'start');
    expect(part('content')).toHaveAttribute('data-size', 'sm');
    expect(part('close-trigger')).toHaveClass('contour-drawer__close-trigger');
  });

  it('puts the x, a target of 24px at least, in the top end corner, beside the header', async () => {
    await render(<Navigation defaultOpen />);
    const content = restingContent().getBoundingClientRect();
    const close = part('close-trigger');
    const box = close.getBoundingClientRect();

    // WCAG 2.2, 2.5.8.
    expect(close).toHaveAttribute('data-size', 'md');
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
    // About as far from the top as from the end, within a pixel: the border is on the end side.
    expect(Math.abs(box.top - content.top - (content.right - box.right))).toBeLessThanOrEqual(1);
    // The header makes room for it.
    expect(part('title').getBoundingClientRect().right).toBeLessThanOrEqual(box.left);
  });

  it('is styled with semantic tokens, with a border on its inner side only', async () => {
    await render(<Navigation defaultOpen />);
    const content = restingContent();
    const border = px(vars['border-width'].default);

    expect(content).toHaveStyle({
      backgroundColor: color(vars.color.bg.surface),
      borderRightColor: color(vars.color.border.default),
      boxShadow: computed('box-shadow', vars.shadow.overlay),
      paddingTop: px(vars.space['panel-inset']),
    });
    // From the start: the border on the end side, the inner one.
    expect(borderWidths(content)).toStrictEqual(['0px', '0px', border, '0px']);
    expect(part('backdrop')).toHaveStyle({
      backgroundColor: computed('background-color', vars.color.overlay.scrim),
    });
    expect(getComputedStyle(part('positioner')).zIndex).toBe(
      computed('z-index', vars.layer.overlay),
    );
  });

  it('holds the content against the edge of its placement', async () => {
    const screen = await render(<Navigation defaultOpen />);
    let box = restingContent().getBoundingClientRect();
    expect([box.left, box.top, box.width, box.height]).toStrictEqual([
      0,
      0,
      320,
      window.innerHeight,
    ]);

    await screen.rerender(<Navigation defaultOpen placement="end" />);
    expect(part('content')).toHaveAttribute('data-placement', 'end');
    box = restingContent().getBoundingClientRect();
    expect([box.right, box.top, box.width]).toStrictEqual([window.innerWidth, 0, 320]);
    const border = px(vars['border-width'].default);
    expect(borderWidths(part('content'))).toStrictEqual([border, '0px', '0px', '0px']);

    await screen.rerender(<Navigation defaultOpen placement="top" />);
    expect(part('content')).toHaveAttribute('data-placement', 'top');
    box = restingContent().getBoundingClientRect();
    expect([box.left, box.top, box.width]).toStrictEqual([0, 0, window.innerWidth]);
    expect(box.height).toBeLessThan(window.innerHeight / 2);

    await screen.rerender(<Navigation defaultOpen placement="bottom" />);
    expect(part('content')).toHaveAttribute('data-placement', 'bottom');
    box = restingContent().getBoundingClientRect();
    expect([box.left, box.bottom, box.width]).toStrictEqual([
      0,
      window.innerHeight,
      window.innerWidth,
    ]);
    expect(borderWidths(part('content'))).toStrictEqual(['0px', border, '0px', '0px']);
  });

  it('puts start and end on the sides of the direction of the text', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    const screen = await render(<Navigation defaultOpen />);

    let box = restingContent().getBoundingClientRect();
    expect(box.right).toBe(window.innerWidth);
    const border = px(vars['border-width'].default);
    expect(borderWidths(part('content'))).toStrictEqual([border, '0px', '0px', '0px']);
    await screen.rerender(<Navigation defaultOpen placement="end" />);
    box = restingContent().getBoundingClientRect();
    expect(box.left).toBe(0);
  });

  it('reaches in as far as its size, never further than the viewport', async () => {
    await page.viewport(1024, 768);
    const screen = await render(<Navigation defaultOpen size="md" />);
    expect(part('content')).toHaveAttribute('data-size', 'md');
    expect(restingContent().getBoundingClientRect().width).toBe(448);

    await screen.rerender(<Navigation defaultOpen size="lg" />);
    expect(restingContent().getBoundingClientRect().width).toBe(640);
    await screen.rerender(<Navigation defaultOpen size="full" />);
    expect(restingContent().getBoundingClientRect().width).toBe(window.innerWidth);
    await screen.rerender(<Navigation defaultOpen size="full" placement="bottom" />);
    expect(restingContent().getBoundingClientRect().height).toBe(window.innerHeight);

    await page.viewport(414, 896);
    await screen.rerender(<Navigation defaultOpen size="lg" />);
    expect(restingContent().getBoundingClientRect().width).toBe(414);
  });

  it('keeps the footer at the far end, with the body between', async () => {
    await render(<Navigation defaultOpen />);
    const content = restingContent().getBoundingClientRect();
    const footer = part('footer').getBoundingClientRect();

    expect(content.bottom - footer.bottom).toBeCloseTo(pixels(vars.space['panel-inset']), 0);
  });

  it('hides a header, a body or a footer with `hidden`, though each sets its display', async () => {
    await render(
      <Drawer.Root defaultOpen>
        <Portal>
          <Drawer.Positioner>
            <Drawer.Content aria-label="Menu">
              <Drawer.Header hidden />
              <Drawer.Body hidden />
              <Drawer.Footer hidden />
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>,
    );

    const names = ['header', 'body', 'footer'];

    expect(names.map((name) => [name, getComputedStyle(part(name)).display])).toStrictEqual(
      names.map((name) => [name, 'none']),
    );
  });

  it('opens from its trigger, closes on Escape, and focus goes back to the trigger', async () => {
    const screen = await render(<Navigation />);
    const trigger = screen.getByRole('button', { name: 'Menu' });

    await userEvent.click(trigger);
    await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveFocus();
    // Slides out, then hides.
    expect(part('content')).toHaveAttribute('data-state', 'closed');
    await expect.poll(() => part('content').hidden).toBe(true);
  });

  it('scrolls the body to the element it focuses as it opens, below the fold', async () => {
    const screen = await render(
      <Drawer.Root initialFocusEl={() => document.querySelector<HTMLElement>('#link-79')}>
        <Drawer.Trigger asChild>
          <Button variant="ghost">Menu</Button>
        </Drawer.Trigger>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.CloseTrigger />
              <Drawer.Header>
                <Drawer.Title>Menu</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                {Array.from({ length: 80 }, (_, index) => (
                  <a
                    key={index}
                    id={`link-${index}`}
                    href={`#page-${index}`}
                    style={{ display: 'block' }}
                  >
                    {`Page ${index}`}
                  </a>
                ))}
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const last = screen.getByRole('link', { name: 'Page 79' });
    await expect.element(last).toHaveFocus();
    // Measured while the content still slides in; the scroll holds once it is at rest.
    restingContent();

    const body = part('body').getBoundingClientRect();
    const rect = last.element().getBoundingClientRect();
    expect(rect.top).toBeGreaterThanOrEqual(body.top);
    expect(rect.bottom).toBeLessThanOrEqual(body.bottom);
  });

  it('slides in from its edge, and only fades when the user prefers reduced motion', async () => {
    const screen = await render(<Navigation />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const content = part('content');
    expect(getComputedStyle(content).animationName).toBe('contour-drawer-in');
    expect(content.style.getPropertyValue('translate')).toBe('');
    expect(getComputedStyle(content).getPropertyValue('--contour-drawer-offset').trim()).toBe(
      '-100% 0',
    );

    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await expect.poll(() => getComputedStyle(content).animationName).toBe('contour-drawer-fade-in');
    await userEvent.keyboard('{Escape}');
    expect(getComputedStyle(content).animationName).toBe('contour-drawer-fade-out');
  });
});
