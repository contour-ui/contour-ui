import { vars } from '@contour-ui/tokens';
import { createRef } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Link } from '../index.ts';

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

/** The font properties of `element` that a link should take from the text around it. */
function fontOf(element: Element): string[] {
  const style = getComputedStyle(element);
  return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight];
}

/** A router's link: takes `to` instead of `href` and passes the rest on to `<a>`. */
function RouterLink({
  to,
  children,
  ...props
}: ComponentProps<'a'> & { readonly to: string }): ReactElement {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  );
}

describe('Link', () => {
  it('renders an `<a>` with its class and attributes, `plain` by default', async () => {
    const screen = await render(
      <Link href="/docs" className="nav-link">
        Docs
      </Link>,
    );
    const link = screen.getByRole('link', { name: 'Docs' });

    expect(link.element().tagName).toBe('A');
    await expect.element(link).toHaveAttribute('class', 'contour-link nav-link');
    await expect.element(link).toHaveAttribute('href', '/docs');
    await expect.element(link).toHaveAttribute('data-scope', 'link');
    await expect.element(link).toHaveAttribute('data-part', 'root');
    await expect.element(link).toHaveAttribute('data-variant', 'plain');
  });

  it('is styled with semantic tokens', async () => {
    const screen = await render(
      <Link variant="underline" href="/docs">
        Docs
      </Link>,
    );
    const link = screen.getByRole('link', { name: 'Docs' });
    const accentForeground = computed('color', vars.color.accent.fg);
    // The pointer stays where earlier tests on the page left it; over the link, it would thicken
    // the underline.
    await userEvent.unhover(link);

    // The token resolves to a real color (tokens.css is loaded), and the kit uses it.
    expect(accentForeground).toMatch(/^oklch\(/u);
    await expect.element(link).toHaveStyle({
      color: accentForeground,
      textDecorationLine: 'underline',
      textDecorationThickness: computed('padding-top', vars['border-width'].default),
    });
  });

  it('underlines `plain` on hover and thickens the underline of `underline`', async () => {
    const screen = await render(
      <p>
        <Link href="/plain">Plain</Link>{' '}
        <Link variant="underline" href="/underline">
          Underline
        </Link>
      </p>,
    );
    const plain = screen.getByRole('link', { name: 'Plain' });
    const underline = screen.getByRole('link', { name: 'Underline' });
    const thick = computed('padding-top', `calc(2 * ${vars['border-width'].default})`);
    // Off both links first, wherever earlier tests on the page left the pointer.
    await userEvent.unhover(plain);

    await expect.element(plain).toHaveStyle({ textDecorationLine: 'none' });
    await userEvent.hover(plain);
    await expect.element(plain).toHaveStyle({ textDecorationLine: 'underline' });

    await userEvent.hover(underline);
    await expect.element(plain).toHaveStyle({ textDecorationLine: 'none' });
    await expect.element(underline).toHaveStyle({ textDecorationThickness: thick });
  });

  it('shows the focus ring on keyboard focus', async () => {
    const screen = await render(
      <>
        <button type="button">Before</button>
        <Link href="/docs">Docs</Link>
      </>,
    );
    const link = screen.getByRole('link', { name: 'Docs' });

    await userEvent.click(screen.getByRole('button', { name: 'Before' }));
    await userEvent.keyboard('{Tab}');

    await expect.element(link).toHaveFocus();
    await expect.element(link).toHaveStyle({
      outlineStyle: 'solid',
      outlineColor: computed('color', vars.color.border.focus),
      outlineWidth: computed('padding-top', vars['border-width'].focus),
    });
  });

  it('takes the font of the text around it', async () => {
    const screen = await render(
      <p style={{ font: vars.text.prose.font }}>
        Read the <Link href="/docs">guide</Link>.
      </p>,
    );
    const link = screen.getByRole('link', { name: 'guide' }).element();
    const paragraph = screen.getByRole('paragraph').element();

    expect(fontOf(link)).toStrictEqual(fontOf(paragraph));
  });

  it('adds nothing to external links', async () => {
    const screen = await render(<Link href="https://example.com/">Example</Link>);
    const link = screen.getByRole('link', { name: 'Example' });

    await expect.element(link).not.toHaveAttribute('target');
    await expect.element(link).not.toHaveAttribute('rel');
  });

  it('passes its ref and props on to the `<a>`', async () => {
    const ref = createRef<HTMLAnchorElement>();
    const screen = await render(
      <Link ref={ref} href="https://example.com/" target="_blank" rel="noreferrer">
        Example
      </Link>,
    );
    const link = screen.getByRole('link', { name: 'Example' });

    expect(ref.current).toBe(link.element());
    await expect.element(link).toHaveAttribute('target', '_blank');
    await expect.element(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders a router link with `asChild`, keeping its `href`', async () => {
    const ref = createRef<HTMLAnchorElement>();
    const screen = await render(
      <Link asChild variant="underline" ref={ref}>
        <RouterLink to="/docs/guide" className="router-link">
          Guide
        </RouterLink>
      </Link>,
    );
    const link = screen.getByRole('link', { name: 'Guide' });

    await expect.element(link).toHaveAttribute('href', '/docs/guide');
    await expect.element(link).toHaveAttribute('class', 'contour-link router-link');
    await expect.element(link).toHaveAttribute('data-variant', 'underline');
    expect(ref.current).toBe(link.element());
  });
});
