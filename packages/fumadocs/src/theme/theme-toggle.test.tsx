import type { ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage, DocsProvider, HomeLayout, ThemeToggle } from '../index.ts';
import { MemoryFramework } from '../test-utils/framework.tsx';
import { pageTree } from '../test-utils/page-tree.ts';
import { renderDocs } from '../test-utils/render.tsx';
import { site } from '../test-utils/site.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/kit/styles.css';

const root = document.documentElement;

const picker = page.getByRole('radiogroup', { name: 'Theme' });

/** The item of the picker named `name`: the label the reader clicks, around its radio button. */
function item(name: string): Element {
  const label = picker.getByRole('radio', { name }).element().closest('label');
  if (label === null) {
    throw new Error(`No item ${name}.`);
  }
  return label;
}

afterEach(async () => {
  localStorage.clear();
  delete root.dataset['theme'];
  // The default viewport of the browser tests.
  await page.viewport(414, 896);
});

describe('ThemeToggle', () => {
  it('switches between the light and the dark theme, by default', async () => {
    await renderDocs(<ThemeToggle />, { theme: { defaultTheme: 'dark' } });

    await userEvent.click(page.getByRole('button', { name: 'Switch to the light theme' }));
    await expect
      .element(page.getByRole('button', { name: 'Switch to the dark theme' }))
      .toBeVisible();
    expect(root.dataset['theme']).toBe('light');
    expect(localStorage.getItem('contour-theme')).toBe('light');
  });

  it('offers the light, the dark and the system theme in the light-dark-system mode', async () => {
    await renderDocs(<ThemeToggle mode="light-dark-system" />, {
      theme: { defaultTheme: 'system' },
    });
    const system = picker.getByRole('radio', { name: 'System' });

    await expect.element(system).toBeChecked();
    await userEvent.click(item('Light'));
    await expect.element(picker.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(root.dataset['theme']).toBe('light');
    expect(localStorage.getItem('contour-theme')).toBe('light');

    await userEvent.click(item('Dark'));
    await expect.element(picker.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(root.dataset['theme']).toBe('dark');
    await userEvent.click(item('System'));
    await expect.element(system).toBeChecked();
    expect(localStorage.getItem('contour-theme')).toBe('system');
  });

  it('takes its mode from DocsProvider, unless it is given one', async () => {
    await renderDocs(
      <>
        <ThemeToggle />
        <ThemeToggle mode="light-dark" />
      </>,
      { themeToggle: { mode: 'light-dark-system' }, theme: { defaultTheme: 'dark' } },
    );

    await expect.element(picker).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Switch to the light theme' }))
      .toBeVisible();
  });

  it('checks no choice in the HTML of the server, and the stored one once hydrated', async () => {
    localStorage.setItem('contour-theme', 'system');
    const ui: ReactElement = (
      <MemoryFramework>
        <DocsProvider site={site} search={false}>
          <ThemeToggle mode="light-dark-system" />
        </DocsProvider>
      </MemoryFramework>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(ui);
    document.body.append(container);

    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(3);
    expect(container.querySelector('input:checked')).toBeNull();

    const mismatches: unknown[] = [];
    const hydrated = hydrateRoot(container, ui, {
      onRecoverableError: (error) => {
        mismatches.push(error);
      },
    });
    await expect
      .poll(() => container.querySelector('input:checked')?.getAttribute('aria-label'))
      .toBe('System');
    expect(mismatches).toStrictEqual([]);
    hydrated.unmount();
    container.remove();
  });
});

describe('the theme toggle of the layouts', () => {
  it('follows the mode of DocsProvider in the sidebar and in the header', async () => {
    await page.viewport(1280, 800);
    const screen = await renderDocs(
      <DocsLayout tree={pageTree}>
        <DocsPage title="Page" toc={[]}>
          <p>Content</p>
        </DocsPage>
      </DocsLayout>,
      { pathname: '/docs/kit/button', themeToggle: { mode: 'light-dark-system' } },
    );
    await expect
      .element(page.getByRole('banner').getByRole('radiogroup', { name: 'Theme' }))
      .toBeVisible();

    await screen.rerender(
      <MemoryFramework>
        <DocsProvider site={site} search={false} themeToggle={{ mode: 'light-dark-system' }}>
          <HomeLayout>
            <p>Home</p>
          </HomeLayout>
        </DocsProvider>
      </MemoryFramework>,
    );
    await expect
      .element(page.getByRole('banner').getByRole('radiogroup', { name: 'Theme' }))
      .toBeVisible();
  });
});
