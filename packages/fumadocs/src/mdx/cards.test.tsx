import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { MemoryFramework } from '../test-utils/framework.tsx';
import { Card, Cards } from './cards.tsx';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/react/styles.css';

describe('Cards', () => {
  it('lays its cards out on a grid', async () => {
    const screen = await render(
      <Cards className="custom" data-testid="cards">
        <Card title="Kit" />
        <Card title="Audio" />
      </Cards>,
    );
    const grid = screen.getByTestId('cards');

    await expect.element(grid).toHaveClass('contour-docs-cards custom', { exact: true });
    await expect.element(grid).toHaveStyle({ display: 'grid' });
  });
});

describe('Card', () => {
  it('renders the styled Card, size `lg`, with the title and the description', async () => {
    const screen = await render(
      <Card title="Kit" description="Styled general-purpose components." data-testid="card" />,
    );
    const card = screen.getByTestId('card');

    await expect.element(card).toHaveClass('contour-card contour-docs-card', { exact: true });
    expect(card.element().tagName).toBe('DIV');
    await expect.element(card).toHaveAttribute('data-size', 'lg');
    // The title is the styled Card's but no heading, so cards keep the outline of the page.
    expect(screen.getByText('Kit').element()).toHaveClass('contour-card__title', { exact: true });
    expect(screen.getByText('Kit').element().tagName).toBe('SPAN');
    expect(card.element().querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
    expect(screen.getByText('Styled general-purpose components.').element().tagName).toBe('P');
    expect(card.element().querySelector('.contour-card__header')).toBeNull();
  });

  it('wraps its children, which MDX puts in paragraphs, in the description', async () => {
    const screen = await render(
      <Card title="Kit" data-testid="card">
        <p>First.</p>
        <p>Second.</p>
      </Card>,
    );
    const first = screen.getByText('First.').element();

    // A `div`: paragraphs cannot nest in the description's own `p`.
    expect(first.parentElement?.tagName).toBe('DIV');
    expect(first.parentElement).toHaveClass('contour-card__description');
    expect(first.parentElement?.children).toHaveLength(2);
  });

  it('shows its icon in the header, above the title', async () => {
    const screen = await render(
      <Card title="Kit" icon={<svg data-testid="icon" />} data-testid="card" />,
    );
    const icon = screen.getByTestId('icon');
    await expect.element(icon).toBeInTheDocument();
    const header = icon.element().parentElement;

    expect(header).toHaveClass('contour-card__header contour-docs-card__icon', { exact: true });
    expect(header?.nextElementSibling).toHaveClass('contour-card__body');
  });

  it('is one link to a page of the site, through the framework link', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await render(
      <MemoryFramework pathname="/docs" onNavigate={onNavigate}>
        <Card title="Kit" description="Styled components." href="/docs/kit" />
      </MemoryFramework>,
    );
    const link = page.getByRole('link', { name: 'Kit Styled components.' });

    await expect.element(link).toHaveClass('contour-card contour-docs-card', { exact: true });
    await expect.element(link).toHaveAttribute('href', '/docs/kit');
    await expect.element(link).toHaveAttribute('data-framework-link');
    await expect.element(link).not.toHaveAttribute('target');

    await userEvent.click(link);
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/kit');
  });

  it('opens another site in a new tab, and a path too when it is `external`', async () => {
    await render(
      <MemoryFramework>
        <Card title="Fumadocs" href="https://fumadocs.dev/" />
        <Card title="Changelog" href="/changelog.html" external />
        <Card title="Guide" href="/docs/guide" external={false} />
      </MemoryFramework>,
    );

    for (const title of ['Fumadocs', 'Changelog']) {
      // Its name says so, as the names of the site's other links to another site do.
      const link = page.getByRole('link', { name: `${title} (opens in a new tab)` }).element();
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer noopener');
      expect(link).not.toHaveAttribute('data-framework-link');
    }
    const guide = page.getByRole('link', { name: 'Guide' }).element();
    expect(guide).not.toHaveAttribute('target');
    expect(guide).toHaveAttribute('data-framework-link');
  });

  it('says that it opens a new tab without showing it', async () => {
    await render(
      <MemoryFramework>
        <Card title="Fumadocs" description="Docs framework." href="https://fumadocs.dev/" />
      </MemoryFramework>,
    );
    const card = page.getByRole('link', { name: /^Fumadocs/u }).element();
    const note = page.getByText('(opens in a new tab)').element();
    const box = note.getBoundingClientRect();
    const height = card.getBoundingClientRect().height;

    expect(note.closest('a')).toBe(card);
    expect(note).toHaveClass('contour-docs-card__new-tab', { exact: true });
    expect(note.textContent).toBe(' (opens in a new tab)');
    expect([box.width, box.height]).toStrictEqual([1, 1]);
    expect(getComputedStyle(note).clipPath).toBe('inset(50%)');
    // It takes no room: without it, the card is as high.
    note.style.display = 'none';
    expect(card.getBoundingClientRect().height).toBe(height);
  });
});
