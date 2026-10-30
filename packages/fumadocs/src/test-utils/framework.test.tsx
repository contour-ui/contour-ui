import { Link, usePathname, useRouter } from 'fumadocs-core/framework';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { MemoryFramework } from './framework.tsx';

/** The pathname of the framework, a button that pushes a URL, and links of every kind. */
function Location(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <>
      <output aria-label="Pathname">{pathname}</output>
      <button
        type="button"
        onClick={() => {
          void router.push('/docs/essentials?tab=css#usage');
        }}
      >
        Essentials
      </button>
      <Link href="/docs/guide/themes">Themes</Link>
      <Link href="#usage">Usage</Link>
      <Link href="https://example.com/">Example</Link>
      <Link href="/docs/guide" target="_blank">
        Guide
      </Link>
    </>
  );
}

/** The link named `name` on the page. */
const linkNamed = (name: string): Element => page.getByRole('link', { name }).element();

/**
 * Click `link` with `init`, and tell whether something on the way canceled the click: a link
 * that navigates itself does. The click is canceled after that in any case, so the browser
 * never follows the link out of the test.
 */
function isClickHandled(link: Element, init: MouseEventInit = {}): boolean {
  let handled = false;
  const listener = (event: Event): void => {
    handled = event.defaultPrevented;
    event.preventDefault();
  };
  // The window hears the click last, after React's handlers on the root.
  window.addEventListener('click', listener);
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
  window.removeEventListener('click', listener);
  return handled;
}

describe('MemoryFramework', () => {
  it('starts at its pathname, and push goes to the pathname of a URL', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await render(
      <MemoryFramework pathname="/docs/guide" onNavigate={onNavigate}>
        <Location />
      </MemoryFramework>,
    );
    const pathname = page.getByRole('status', { name: 'Pathname' });
    await expect.element(pathname).toHaveTextContent('/docs/guide');

    await userEvent.click(page.getByRole('button', { name: 'Essentials' }));
    // The pathname alone: no query, no fragment.
    await expect.poll(() => pathname.element().textContent).toBe('/docs/essentials');
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/essentials?tab=css#usage');
  });

  it('renders Link as a plain link that goes to a page of the site through push', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await render(
      <MemoryFramework pathname="/docs/guide" onNavigate={onNavigate}>
        <Location />
      </MemoryFramework>,
    );
    const themes = page.getByRole('link', { name: 'Themes' });
    await expect.element(themes).toHaveAttribute('href', '/docs/guide/themes');
    await expect.element(themes).toHaveAttribute('data-framework-link');

    await userEvent.click(themes);
    await expect
      .element(page.getByRole('status', { name: 'Pathname' }))
      .toHaveTextContent('/docs/guide/themes');
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/guide/themes');
  });

  it('leaves fragments, other sites, targets and modified clicks to the browser', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await render(
      <MemoryFramework pathname="/docs/guide" onNavigate={onNavigate}>
        <Location />
      </MemoryFramework>,
    );
    expect(isClickHandled(linkNamed('Usage'))).toBe(false);
    expect(isClickHandled(linkNamed('Example'))).toBe(false);
    expect(isClickHandled(linkNamed('Guide'))).toBe(false);
    expect(isClickHandled(linkNamed('Themes'), { metaKey: true })).toBe(false);
    expect(isClickHandled(linkNamed('Themes'), { button: 1 })).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
    // A plain click is the router's.
    expect(isClickHandled(linkNamed('Themes'))).toBe(true);
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/guide/themes');
  });
});
