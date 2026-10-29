import { createRef, StrictMode } from 'react';
import type { ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { render, renderHook } from 'vitest-browser-react';

import { Presence, usePresence } from '../index.ts';
import type { PresenceProps, UsePresenceProps, UsePresenceReturn } from '../index.ts';

/**
 * Animations on `data-state`, long enough never to end during a test: the tests end them through
 * the Web Animations API (`finish()`, `cancel()`), as time or a change of style would.
 */
const STYLES = `
@keyframes presence-test-in { from { opacity: 0; } }
@keyframes presence-test-out { to { opacity: 0; } }
@keyframes presence-test-slide { to { translate: 0 8px; } }
.fade[data-state='open'] { animation: presence-test-in 10s; }
.fade[data-state='closed'] { animation: presence-test-out 10s; }
.fade-and-slide[data-state='closed'] { animation: presence-test-out 10s, presence-test-slide 20s; }
.steady { animation: presence-test-slide 10s; }
.endless[data-state='closed'] { animation: presence-test-out 1s infinite; }
.missing-keyframes[data-state='closed'] { animation: presence-test-missing 10s; }
.zero-duration[data-state='closed'] { animation: presence-test-out 0s; }
.no-box[data-state='closed'] { display: none; animation: presence-test-out 10s; }
.short[data-state='closed'] { animation: presence-test-out 50ms; }
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

/** The element of a `Presence`, or `null` while it is unmounted. */
function presenceIn(container: Element): HTMLElement | null {
  return container.querySelector<HTMLElement>('[data-scope="presence"]');
}

/** The element of a `Presence` that is mounted. */
function presenceOf(container: Element): HTMLElement {
  const element = presenceIn(container);
  if (element === null) {
    throw new Error('No presence element.');
  }
  return element;
}

/** The names of the animations an element runs. */
function runningAnimations(element: Element): string[] {
  return element
    .getAnimations()
    .filter((animation) => animation.playState === 'running')
    .map((animation) => (animation instanceof CSSAnimation ? animation.animationName : 'other'));
}

/** End the animations an element runs, as time would. */
function finishAnimations(element: Element): void {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
}

/** Wait for the browser to render frames: animation events go out with them. */
async function frames(count = 2): Promise<void> {
  for (let frame = 0; frame < count; frame += 1) {
    // oxlint-disable-next-line no-await-in-loop -- one frame after the other.
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }
}

/** Whether an element has the `hidden` attribute. */
function isHidden(element: Element): boolean {
  return element.hasAttribute('hidden');
}

/** Where a presence is: unmounted, mounted but hidden, or shown. */
function statusOf(container: Element): 'unmounted' | 'hidden' | 'shown' {
  const element = presenceIn(container);
  if (element === null) {
    return 'unmounted';
  }
  return isHidden(element) ? 'hidden' : 'shown';
}

/** A presence with text, opened and closed through `screen.rerender`. */
function Details(props: PresenceProps): ReactElement | null {
  return <Presence {...props}>Ships in two days.</Presence>;
}

/** A presence that closes, from open, and the spy of its `onExitComplete`. */
async function closing(props: Omit<PresenceProps, 'present'> = {}) {
  const onExitComplete = vi.fn<() => void>();
  const screen = await render(<Details {...props} present onExitComplete={onExitComplete} />);
  const element = presenceOf(screen.container);
  await screen.rerender(<Details {...props} present={false} onExitComplete={onExitComplete} />);
  return { screen, element, onExitComplete };
}

/** A positioner and its content on one presence: the content runs the animation. */
function Layer({ present }: { readonly present: boolean }): ReactElement | null {
  const { mounted, ref, getPresenceProps } = usePresence({ present, unmountOnExit: true });
  if (!mounted) {
    return null;
  }
  return (
    <div {...getPresenceProps()} data-part="positioner">
      <div
        ref={ref}
        {...getPresenceProps()}
        data-part="content"
        data-state={present ? 'open' : 'closed'}
        className="fade"
      >
        Ships in two days.
      </div>
    </div>
  );
}

const CLOSED: UsePresenceProps = { present: false };

/** `usePresence` for `renderHook`, which may call it without props. */
function usePresenceOf(props?: UsePresenceProps): UsePresenceReturn {
  return usePresence(props ?? CLOSED);
}

describe('Presence', () => {
  it('renders a div with its state, hidden while closed', async () => {
    const screen = await render(<Details present={false} />);
    const element = presenceOf(screen.container);

    expect(element.tagName).toBe('DIV');
    expect(element).toHaveAttribute('data-scope', 'presence');
    expect(element).toHaveAttribute('data-part', 'root');
    expect(element).toHaveAttribute('data-state', 'closed');
    expect(element).toHaveAttribute('hidden');

    await screen.rerender(<Details present />);
    expect(element).toHaveAttribute('data-state', 'open');
    expect(element).not.toHaveAttribute('hidden');
    expect(element).not.toHaveAttribute('inert');
  });

  it('keeps showing a closed element, inert, until its exit animation ends', async () => {
    const { element, onExitComplete } = await closing({ className: 'fade' });

    expect(element).toHaveAttribute('data-state', 'closed');
    expect(element).not.toHaveAttribute('hidden');
    expect(element).toHaveAttribute('inert');
    expect(runningAnimations(element)).toStrictEqual(['presence-test-out']);
    await frames();
    expect(element).not.toHaveAttribute('hidden');
    expect(onExitComplete).not.toHaveBeenCalled();

    finishAnimations(element);
    await expect.poll(() => isHidden(element)).toBe(true);
    expect(element).not.toHaveAttribute('inert');
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('hides the element in the frame its animation ends, before the browser paints', async () => {
    const { element, onExitComplete } = await closing({ className: 'short' });
    const seen: string[] = [];
    // In the frame the animation ends, the browser settles its promise, then sends
    // `animationend`, then paints.
    element.addEventListener('animationend', () => {
      seen.push(`animationend, hidden: ${String(isHidden(element))}`);
    });
    onExitComplete.mockImplementation(() => {
      seen.push(`exit complete, hidden: ${String(isHidden(element))}`);
    });

    await expect
      .poll(() => seen)
      .toStrictEqual(['exit complete, hidden: true', 'animationend, hidden: true']);
  });

  it('closes at once without an exit animation', async () => {
    const { element, onExitComplete } = await closing();

    expect(element).toHaveAttribute('data-state', 'closed');
    expect(element).toHaveAttribute('hidden');
    expect(element).not.toHaveAttribute('inert');
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('closes at once when the closed state keeps the animation of the open one', async () => {
    const screen = await render(<Details className="steady" present />);
    const element = presenceOf(screen.container);
    expect(runningAnimations(element)).toStrictEqual(['presence-test-slide']);

    // Still running once closed, but it was running before: no exit.
    await screen.rerender(<Details className="steady" present={false} />);
    expect(element).toHaveAttribute('hidden');
  });

  it.for(['endless', 'missing-keyframes', 'zero-duration', 'no-box'])(
    'closes at once when the browser runs no exit animation to wait for: %s',
    async (className) => {
      const { element, onExitComplete } = await closing({ className });

      expect(element).toHaveAttribute('hidden');
      expect(onExitComplete).toHaveBeenCalledOnce();
    },
  );

  it('waits for every exit animation of the element', async () => {
    const { element } = await closing({ className: 'fade-and-slide' });
    const [fade, slide] = element.getAnimations();

    fade?.finish();
    await frames();
    expect(element).not.toHaveAttribute('hidden');

    slide?.finish();
    await expect.poll(() => isHidden(element)).toBe(true);
  });

  it('ignores the animations of its children', async () => {
    const onExitComplete = vi.fn<() => void>();
    const details = (present: boolean): ReactElement => (
      <Presence present={present} className="fade" onExitComplete={onExitComplete}>
        <span className="steady">Ships in two days.</span>
      </Presence>
    );
    const screen = await render(details(true));
    const element = presenceOf(screen.container);
    const child = screen.getByText('Ships in two days.').element();
    await screen.rerender(details(false));

    // The end of the child's animation bubbles up to the element.
    finishAnimations(child);
    await frames();
    expect(element).not.toHaveAttribute('hidden');
    expect(onExitComplete).not.toHaveBeenCalled();

    finishAnimations(element);
    await expect.poll(() => isHidden(element)).toBe(true);
  });

  it('shows again when present during the exit, which cancels it', async () => {
    const { screen, element, onExitComplete } = await closing({ className: 'fade' });
    const [exit] = element.getAnimations();

    await screen.rerender(<Details className="fade" present onExitComplete={onExitComplete} />);
    expect(element).toHaveAttribute('data-state', 'open');
    expect(element).not.toHaveAttribute('hidden');
    expect(element).not.toHaveAttribute('inert');
    expect(exit?.playState).toBe('idle');
    // The browser sends `animationcancel` for the cancelled exit at the next frame; then the enter
    // animation ends.
    await frames();
    finishAnimations(element);
    await frames();
    expect(element).not.toHaveAttribute('hidden');
    expect(onExitComplete).not.toHaveBeenCalled();

    // The next close waits for its own animation.
    await screen.rerender(
      <Details className="fade" present={false} onExitComplete={onExitComplete} />,
    );
    await frames();
    expect(element).not.toHaveAttribute('hidden');
    finishAnimations(element);
    await expect.poll(() => isHidden(element)).toBe(true);
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('closes when its exit animation is cancelled while it runs', async () => {
    const { element, onExitComplete } = await closing({ className: 'fade' });
    await frames();

    for (const animation of element.getAnimations()) {
      animation.cancel();
    }
    await expect.poll(() => isHidden(element)).toBe(true);
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('closes when its exit animation is cancelled before it starts', async () => {
    const { element, onExitComplete } = await closing({ className: 'fade' });

    // Cancelled before the next frame, it never starts, and the browser sends no event.
    for (const animation of element.getAnimations()) {
      animation.cancel();
    }
    await expect.poll(() => isHidden(element)).toBe(true);
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it.for([
    { lazyMount: false, unmountOnExit: false, before: 'hidden', after: 'hidden' },
    { lazyMount: true, unmountOnExit: false, before: 'unmounted', after: 'hidden' },
    { lazyMount: false, unmountOnExit: true, before: 'hidden', after: 'unmounted' },
    { lazyMount: true, unmountOnExit: true, before: 'unmounted', after: 'unmounted' },
  ] as const)(
    'lazyMount $lazyMount, unmountOnExit $unmountOnExit: $before before it opens, $after after',
    async ({ lazyMount, unmountOnExit, before, after }) => {
      const mount = { lazyMount, unmountOnExit };
      const screen = await render(<Details {...mount} present={false} />);
      expect(statusOf(screen.container)).toBe(before);

      await screen.rerender(<Details {...mount} present />);
      expect(statusOf(screen.container)).toBe('shown');

      await screen.rerender(<Details {...mount} present={false} />);
      expect(statusOf(screen.container)).toBe(after);

      await screen.rerender(<Details {...mount} present />);
      expect(statusOf(screen.container)).toBe('shown');
    },
  );

  it('unmounts with unmountOnExit once the exit animation ends', async () => {
    const { screen, element, onExitComplete } = await closing({
      className: 'fade',
      unmountOnExit: true,
    });
    onExitComplete.mockImplementation(() => {
      expect(element.isConnected).toBe(false);
    });

    expect(statusOf(screen.container)).toBe('shown');
    finishAnimations(element);
    await expect.poll(() => statusOf(screen.container)).toBe('unmounted');
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('unmounts during the exit without an error, and leaves no listener behind', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const onExitComplete = vi.fn<() => void>();
    const screen = await render(
      <Details className="fade" present onExitComplete={onExitComplete} />,
    );
    const element = presenceOf(screen.container);
    const added = vi.spyOn(element, 'addEventListener');
    const removed = vi.spyOn(element, 'removeEventListener');
    await screen.rerender(
      <Details className="fade" present={false} onExitComplete={onExitComplete} />,
    );
    const [exit] = element.getAnimations();
    await frames();

    await screen.unmount();
    // Removing the element cancels its animation, which settles at once.
    expect(exit?.playState).toBe('idle');
    await frames();
    expect(removed.mock.calls).toStrictEqual(added.mock.calls);
    expect(onExitComplete).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('renders its child with asChild and gives the ref the same element', async () => {
    const ref = createRef<HTMLDivElement>();
    const details = (present: boolean): ReactElement => (
      <Presence asChild present={present} ref={ref}>
        <section aria-label="Shipping" className="fade">
          Ships in two days.
        </section>
      </Presence>
    );
    const screen = await render(details(true));
    const section = screen.getByRole('region', { name: 'Shipping' }).element();

    expect(section).toHaveAttribute('data-scope', 'presence');
    expect(section).toHaveAttribute('data-state', 'open');
    expect(ref.current).toBe(section);

    await screen.rerender(details(false));
    expect(section).not.toHaveAttribute('hidden');
    finishAnimations(section);
    await expect.poll(() => section.hasAttribute('hidden')).toBe(true);
  });

  it('works the same in Strict Mode', async () => {
    const onExitComplete = vi.fn<() => void>();
    const screen = await render(
      <Details className="fade" present onExitComplete={onExitComplete} />,
      { wrapper: StrictMode },
    );
    const element = presenceOf(screen.container);

    await screen.rerender(
      <Details className="fade" present={false} onExitComplete={onExitComplete} />,
    );
    expect(element).not.toHaveAttribute('hidden');
    finishAnimations(element);
    await expect.poll(() => isHidden(element)).toBe(true);
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('renders the same markup on the server and hydrates it without a mismatch', async () => {
    expect(renderToString(<Details present={false} lazyMount />)).toBe('');

    const consoleError = vi.spyOn(console, 'error');
    const page = (
      <main>
        <Details present={false} />
      </main>
    );
    const html = renderToString(page);
    expect(html).toBe(
      '<main><div data-scope="presence" data-part="root" data-state="closed" hidden="">Ships in two days.</div></main>',
    );
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const errors: unknown[] = [];
    const root = hydrateRoot(container, page, {
      onRecoverableError: (error) => {
        errors.push(error);
      },
    });

    try {
      await frames();
      expect(presenceOf(container)).toHaveAttribute('hidden');
      expect(errors).toStrictEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      root.unmount();
      container.remove();
    }
  });
});

describe('usePresence', () => {
  it('shows and hides several parts with the animation of one element', async () => {
    const screen = await render(<Layer present />);
    const positioner = screen.container.querySelector<HTMLElement>('[data-part="positioner"]');
    const content = screen.getByText('Ships in two days.').element();

    await screen.rerender(<Layer present={false} />);
    expect(positioner).not.toHaveAttribute('hidden');
    expect(positioner).toHaveAttribute('inert');
    expect(content).toHaveAttribute('data-state', 'closed');

    finishAnimations(content);
    await expect.poll(() => positioner?.isConnected).toBe(false);
    expect(content.isConnected).toBe(false);
  });

  it('returns whether to mount the element and whether it shows', async () => {
    const { result, rerender } = await renderHook(usePresenceOf, {
      initialProps: { present: false, lazyMount: true },
    });
    expect(result.current).toMatchObject({ mounted: false, visible: false });
    expect(result.current.getPresenceProps()).toStrictEqual({ hidden: true, inert: false });

    await rerender({ present: true, lazyMount: true });
    expect(result.current).toMatchObject({ mounted: true, visible: true });
    expect(result.current.getPresenceProps()).toStrictEqual({ hidden: false, inert: false });

    // No element took the ref: nothing to wait for.
    await rerender({ present: false, lazyMount: true });
    expect(result.current).toMatchObject({ mounted: true, visible: false });
  });

  it('keeps the identity of its ref', async () => {
    const { result, rerender } = await renderHook(usePresenceOf, {
      initialProps: { present: false },
    });
    const { ref } = result.current;

    await rerender({ present: true });
    expect(result.current.ref).toBe(ref);
  });
});
