import { vars } from '@contour-ui/tokens';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { cdp, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Collapsible } from '../index.ts';

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

/** A color token as the browser computes it. */
const color = (value: string): string => computed('color', value);

/** The element of a collapsible part in the document. */
function part(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[data-scope="collapsible"][data-part="${name}"]`,
  );
  if (element === null) {
    throw new Error(`No collapsible ${name}.`);
  }
  return element;
}

/** The icon an element holds. */
function iconOf(element: Element): SVGSVGElement {
  const icon = element.querySelector('svg');
  if (icon === null) {
    throw new Error('No icon.');
  }
  return icon;
}

/** End the animations an element runs, as time would. */
function finishAnimations(element: Element): void {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
}

/** A collapsible with a chevron and a paragraph. */
function Shipping(props: Collapsible.RootProps): ReactElement {
  return (
    <Collapsible.Root {...props}>
      <Collapsible.Trigger>
        <Collapsible.Indicator />
        Shipping
      </Collapsible.Trigger>
      <Collapsible.Content>
        <p style={{ margin: 0 }}>Orders ship within two business days.</p>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

afterEach(async () => {
  await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

describe('Collapsible', () => {
  it('renders its parts with their classes, and the chevron in the indicator', async () => {
    const screen = await render(<Shipping className="faq" />);

    expect(part('root')).toHaveClass('contour-collapsible', 'faq');
    expect(part('trigger')).toHaveClass('contour-collapsible__trigger');
    expect(part('content')).toHaveClass('contour-collapsible__content');
    expect(part('indicator')).toHaveClass('contour-collapsible__indicator');
    expect(part('indicator').querySelector('svg')).not.toBeNull();
    await expect.element(screen.getByRole('button', { name: 'Shipping' })).toBeVisible();
  });

  it('draws children of its own in the indicator instead of the chevron', async () => {
    await render(
      <Collapsible.Root>
        <Collapsible.Trigger>
          <Collapsible.Indicator>+</Collapsible.Indicator>
          Shipping
        </Collapsible.Trigger>
      </Collapsible.Root>,
    );
    expect(part('indicator')).toHaveTextContent('+');
    expect(part('indicator').querySelector('svg')).toBeNull();
  });

  it('is styled with semantic tokens', async () => {
    const screen = await render(<Shipping />);
    await userEvent.unhover(screen.getByRole('button'));
    const trigger = getComputedStyle(part('trigger'));
    expect(trigger.color).toBe(color(vars.color.fg.default));
    expect(trigger.fontSize).toBe(computed('font-size', vars.text.label.fontSize));
    expect(getComputedStyle(part('indicator')).color).toBe(color(vars.color.fg.muted));
    expect(getComputedStyle(iconOf(part('indicator'))).width).toBe(
      computed('width', vars.size['icon-sm']),
    );
  });

  it('turns the indicator as it opens, and greys out a disabled trigger', async () => {
    const screen = await render(<Shipping />);
    expect(getComputedStyle(part('indicator')).rotate).toBe('none');
    await screen.getByRole('button').click();
    // Once the turn is over.
    await expect.poll(() => getComputedStyle(part('indicator')).rotate).toBe('90deg');

    await screen.rerender(<Shipping disabled />);
    expect(getComputedStyle(part('trigger')).color).toBe(color(vars.color.fg.disabled));
    expect(getComputedStyle(part('trigger')).cursor).toBe('not-allowed');
  });

  it('grows to its height and shrinks back, clipped only while it animates', async () => {
    const screen = await render(<Shipping />);
    const trigger = screen.getByRole('button');
    await trigger.click();
    const content = part('content');
    const style = getComputedStyle(content);
    expect(style.animationName).toBe('contour-collapsible-expand');
    expect(style.overflow).toBe('hidden');
    expect(content.style.getPropertyValue('--height')).toMatch(/^[1-9]\d*px$/u);

    finishAnimations(content);
    await expect.poll(() => getComputedStyle(content).overflow).toBe('visible');

    await trigger.click();
    expect(getComputedStyle(content).animationName).toBe('contour-collapsible-collapse');
    await expect.poll(() => getComputedStyle(content).display).toBe('none');
  });

  it('shows at once when it starts open', async () => {
    await render(<Shipping defaultOpen />);
    expect(getComputedStyle(part('content')).animationName).toBe('none');
    expect(part('content').getAnimations()).toStrictEqual([]);
  });

  it('only fades when the user prefers reduced motion', async () => {
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    const screen = await render(<Shipping />);
    const trigger = screen.getByRole('button');
    await trigger.click();
    expect(getComputedStyle(part('content')).animationName).toBe('contour-collapsible-fade-in');
    expect(getComputedStyle(part('indicator')).transitionDuration).toBe('0s');

    await trigger.click();
    expect(getComputedStyle(part('content')).animationName).toBe('contour-collapsible-fade-out');
    await expect.poll(() => getComputedStyle(part('content')).display).toBe('none');
  });
});
