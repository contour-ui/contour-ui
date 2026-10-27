import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { MemoryFramework } from '../test-utils/framework.tsx';
import { MdxLink } from './link.tsx';

describe('MdxLink', () => {
  it('goes to a page of the site through the framework link', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await render(
      <MemoryFramework pathname="/docs/guide" onNavigate={onNavigate}>
        <MdxLink href="/docs/guide/themes" title="The themes page">
          Themes
        </MdxLink>
      </MemoryFramework>,
    );
    const link = page.getByRole('link', { name: 'Themes' });

    await expect.element(link).toHaveAttribute('href', '/docs/guide/themes');
    await expect.element(link).toHaveAttribute('data-framework-link');
    await expect.element(link).toHaveAttribute('title', 'The themes page');
    await expect.element(link).toHaveClass('contour-link', { exact: true });
    await expect.element(link).toHaveAttribute('data-variant', 'underline');
    await expect.element(link).not.toHaveAttribute('target');

    await userEvent.click(link);
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/guide/themes');
  });

  it('keeps a fragment a plain link on the page', async () => {
    await render(
      <MemoryFramework>
        <MdxLink href="#usage">Usage</MdxLink>
      </MemoryFramework>,
    );
    const link = page.getByRole('link', { name: 'Usage' });

    await expect.element(link).toHaveAttribute('href', '#usage');
    await expect.element(link).not.toHaveAttribute('data-framework-link');
    await expect.element(link).toHaveAttribute('data-variant', 'underline');
    await expect.element(link).not.toHaveAttribute('target');
  });

  it('opens another site in a new tab, with an arrow that says so', async () => {
    await render(
      <MemoryFramework>
        <MdxLink href="https://fumadocs.dev/">Fumadocs</MdxLink>
      </MemoryFramework>,
    );
    const link = page.getByRole('link', { name: /^Fumadocs/u });

    // The label of the arrow joins the name of the link.
    await expect.element(link).toHaveAccessibleName(/opens in a new tab$/u);
    await expect.element(link.getByRole('img', { name: 'opens in a new tab' })).toBeVisible();
    await expect.element(link).toHaveAttribute('href', 'https://fumadocs.dev/');
    await expect.element(link).toHaveAttribute('target', '_blank');
    await expect.element(link).toHaveAttribute('rel', 'noreferrer noopener');
    await expect.element(link).not.toHaveAttribute('data-framework-link');
    await expect.element(link).toHaveAttribute('data-variant', 'underline');
  });
});
