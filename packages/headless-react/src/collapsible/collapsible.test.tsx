import type { collapsible } from '@contour-ui/core';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Collapsible, useCollapsibleContext } from '../index.ts';

/** Animations on `data-state`, long enough never to end during a test: the tests end them. */
const STYLES = `
@keyframes collapsible-test-expand { from { height: 0; } to { height: var(--height); } }
@keyframes collapsible-test-collapse { from { height: var(--height); } to { height: 0; } }
.animated { overflow: hidden; }
.animated[data-state='open'] { animation: collapsible-test-expand 10s; }
.animated[data-state='closed'] { animation: collapsible-test-collapse 10s; }
.sized { block-size: 40px; inline-size: 120px; }
`;

beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.append(style);
  return () => {
    style.remove();
  };
});

const openChangeSpy = () => vi.fn<(details: collapsible.OpenChangeDetails) => void>();

/** The element of a collapsible part in the document, or `null`. */
function partIn(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-scope="collapsible"][data-part="${name}"]`);
}

/** The element of a collapsible part in the document. */
function part(name: string): HTMLElement {
  const element = partIn(name);
  if (element === null) {
    throw new Error(`No collapsible ${name}.`);
  }
  return element;
}

/** The names of the CSS animations an element runs. */
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

/** A collapsible with a trigger, an indicator and content with a box of a known size. */
function Shipping({
  contentClassName = 'sized',
  ...props
}: Collapsible.RootProps & { readonly contentClassName?: string }): ReactElement {
  return (
    <Collapsible.Root {...props}>
      <Collapsible.Trigger>
        Shipping <Collapsible.Indicator>›</Collapsible.Indicator>
      </Collapsible.Trigger>
      <Collapsible.Content className={contentClassName}>
        <div className="sized">Ships in two days.</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/** A collapsible, open, whose content grows by a line on each press of "More". */
function Growing(): ReactElement {
  const [lines, setLines] = useState(1);
  return (
    <Collapsible.Root defaultOpen>
      <Collapsible.Trigger>Shipping</Collapsible.Trigger>
      <button
        type="button"
        onClick={() => {
          setLines(lines + 1);
        }}
      >
        More
      </button>
      <Collapsible.Content>
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="sized" />
        ))}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/** Labels of the button of `Summary`, by state. */
const label: Readonly<Record<string, string>> = { true: 'Hide', false: 'Show' };

/** A part of the owner's that opens and closes the collapsible through the context. */
function Summary(): ReactElement {
  const { open, setOpen } = useCollapsibleContext();
  return (
    <button
      type="button"
      onClick={() => {
        setOpen(!open);
      }}
    >
      {label[String(open)]}
    </button>
  );
}

describe('Collapsible', () => {
  it('renders its parts with their state, and links the trigger to the content', async () => {
    const screen = await render(<Shipping />);
    const trigger = screen.getByRole('button', { name: 'Shipping' });

    await expect.element(trigger).toHaveAttribute('type', 'button');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.element(trigger).toHaveAttribute('aria-controls', part('content').id);
    for (const name of ['root', 'trigger', 'content', 'indicator']) {
      expect(part(name)).toHaveAttribute('data-state', 'closed');
      expect(part(name)).not.toHaveAttribute('data-disabled');
    }
    expect(part('indicator')).toHaveAttribute('aria-hidden', 'true');
    expect(part('content')).toHaveAttribute('hidden');

    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    for (const name of ['root', 'trigger', 'content', 'indicator']) {
      expect(part(name)).toHaveAttribute('data-state', 'open');
    }
    expect(part('content')).not.toHaveAttribute('hidden');
  });

  it('follows an id of the owner on the content', async () => {
    const screen = await render(
      <Collapsible.Root>
        <Collapsible.Trigger>Shipping</Collapsible.Trigger>
        <Collapsible.Content id="shipping">Ships in two days.</Collapsible.Content>
      </Collapsible.Root>,
    );
    await expect.element(screen.getByRole('button')).toHaveAttribute('aria-controls', 'shipping');
  });

  it('writes the size of the open content as `--height` and `--width`', async () => {
    const screen = await render(<Shipping contentClassName="" />);
    await screen.getByRole('button').click();
    const content = part('content');

    expect(content.style.getPropertyValue('--height')).toBe('40px');
    expect(content.style.getPropertyValue('--width')).toBe(`${content.scrollWidth}px`);
  });

  it('measures the content again when it changes size while open', async () => {
    const screen = await render(<Growing />);
    const content = part('content');
    expect(content.style.getPropertyValue('--height')).toBe('40px');

    await screen.getByRole('button', { name: 'More' }).click();
    await expect.poll(() => content.style.getPropertyValue('--height')).toBe('80px');
  });

  it('keeps the closing content shown, inert, until its animation ends, then hides it', async () => {
    const onExitComplete = vi.fn<() => void>();
    const screen = await render(
      <Shipping defaultOpen contentClassName="animated" onExitComplete={onExitComplete} />,
    );
    const content = part('content');

    await screen.getByRole('button').click();
    expect(content).toHaveAttribute('data-state', 'closed');
    expect(content).not.toHaveAttribute('hidden');
    expect(content).toHaveAttribute('inert');
    expect(runningAnimations(content)).toStrictEqual(['collapsible-test-collapse']);
    expect(onExitComplete).not.toHaveBeenCalled();

    finishAnimations(content);
    await expect.element(content).toHaveAttribute('hidden');
    expect(content).not.toHaveAttribute('inert');
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it('does not animate content that starts open, and animates it after it first closes', async () => {
    const screen = await render(<Shipping defaultOpen contentClassName="animated" />);
    const content = part('content');
    expect(content.style.animationName).toBe('none');
    expect(runningAnimations(content)).toStrictEqual([]);

    const trigger = screen.getByRole('button');
    await trigger.click();
    expect(content.style.animationName).toBe('');
    finishAnimations(content);
    await expect.element(content).toHaveAttribute('hidden');

    await trigger.click();
    expect(runningAnimations(content)).toStrictEqual(['collapsible-test-expand']);
    // The open animation runs to the measured height.
    expect(content.style.getPropertyValue('--height')).toBe('40px');
  });

  it('animates content that starts closed as it opens', async () => {
    const screen = await render(<Shipping contentClassName="animated" />);
    await screen.getByRole('button').click();
    const content = part('content');
    expect(content.style.animationName).toBe('');
    expect(runningAnimations(content)).toStrictEqual(['collapsible-test-expand']);
  });

  it('mounts the content on first open with `lazyMount`, and unmounts it with `unmountOnExit`', async () => {
    const screen = await render(<Shipping lazyMount unmountOnExit />);
    const trigger = screen.getByRole('button');
    expect(partIn('content')).toBeNull();
    await expect.element(trigger).not.toHaveAttribute('aria-controls');

    await trigger.click();
    expect(partIn('content')).not.toBeNull();
    await expect.element(trigger).toHaveAttribute('aria-controls', part('content').id);

    await trigger.click();
    await expect.poll(() => partIn('content')).toBeNull();
    await expect.element(trigger).not.toHaveAttribute('aria-controls');
  });

  it('ignores the trigger while disabled', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(<Shipping disabled onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole('button');

    await expect.element(trigger).toBeDisabled();
    for (const name of ['root', 'trigger', 'content', 'indicator']) {
      expect(part(name)).toHaveAttribute('data-disabled', '');
    }
    await userEvent.click(trigger, { force: true });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(part('content')).toHaveAttribute('hidden');
  });

  it('only reports requests while `open` is controlled, and follows the prop', async () => {
    const onOpenChange = openChangeSpy();
    const screen = await render(<Shipping open={false} onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole('button');

    await trigger.click();
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');

    await screen.rerender(<Shipping open onOpenChange={onOpenChange} />);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(part('content')).not.toHaveAttribute('hidden');
  });

  it('keeps the state when a click handler of the owner prevents the default', async () => {
    const screen = await render(
      <Collapsible.Root>
        <Collapsible.Trigger
          onClick={(event) => {
            event.preventDefault();
          }}
        >
          Shipping
        </Collapsible.Trigger>
      </Collapsible.Root>,
    );
    const trigger = screen.getByRole('button');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('gives its parts the API through the context', async () => {
    const screen = await render(
      <Collapsible.Root>
        <Summary />
      </Collapsible.Root>,
    );
    await screen.getByRole('button', { name: 'Show' }).click();
    await expect.element(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();
    expect(() => renderToStaticMarkup(<Summary />)).toThrow(/Collapsible\.Root/u);
  });

  it('renders open content on the server, without its animation', () => {
    const html = renderToStaticMarkup(<Shipping defaultOpen />);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('animation-name:none');
    expect(html).not.toMatch(/ hidden/u);
  });
});
