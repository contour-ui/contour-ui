import { vars } from '@contour-ui/tokens';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { cdp, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Collapsible, Link } from '../index.ts';

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

/** A folder of a sidebar, controlled: its name links to its page, the chevron beside it toggles. */
function Folder(): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
    >
      <Collapsible.Trigger aria-label="Guide pages">
        <Collapsible.Indicator />
      </Collapsible.Trigger>
      <Link href="#guide">Guide</Link>
      <Collapsible.Content>
        <Link href="#themes">Themes</Link>
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

  it('opens and closes with its trigger, which says so in aria-expanded', async () => {
    const screen = await render(<Shipping />);
    const trigger = screen.getByRole('button', { name: 'Shipping' });
    const text = screen.getByText(/Orders ship/u);

    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.element(text).toBeVisible();

    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.element(text).not.toBeVisible();
  });

  it('starts closed, open or disabled, and toggles while controlled, beside a link', async () => {
    const screen = await render(
      <>
        <Shipping />
        <Shipping defaultOpen />
        <Shipping disabled />
        <Folder />
      </>,
    );
    const [closed, open, disabled] = screen.getByRole('button', { name: 'Shipping' }).elements();
    const folder = screen.getByRole('button', { name: 'Guide pages' });
    const themes = screen.getByRole('link', { name: 'Themes' });

    expect(closed).toHaveAttribute('aria-expanded', 'false');
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(disabled).toBeDisabled();
    await expect.element(themes).toBeVisible();

    await userEvent.click(folder);
    await expect.element(themes).not.toBeInTheDocument();
    await userEvent.click(folder);
    await expect.element(themes).toBeVisible();
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
