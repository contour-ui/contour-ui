import { vars } from '@contour-ui/tokens';
import { createRef } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Card } from '../index.ts';

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

/** A length token in px. Border and outline widths compute to 0 without a style, so read padding. */
const length = (value: string): string => computed('padding-top', value);

/** Rendered size of an element, as `<width>x<height>`. */
function box(element: Element): string {
  const { width, height } = element.getBoundingClientRect();
  return `${width}x${height}`;
}

/** A link card, as the docs render one per page. */
function LinkCard(): ReactElement {
  return (
    <Card.Root asChild>
      {/* The link text is in the title and the description, where lint does not look. */}
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
      <a href="/docs/kit">
        <Card.Body>
          <Card.Title>Kit</Card.Title>
          <Card.Description>Styled general-purpose components.</Card.Description>
        </Card.Body>
      </a>
    </Card.Root>
  );
}

describe('Card', () => {
  it('renders each part as its element with its class and data attributes', async () => {
    const screen = await render(
      <Card.Root>
        <Card.Header>
          <Card.Title>Title</Card.Title>
          <Card.Description>Description</Card.Description>
        </Card.Header>
        <Card.Body>Body</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card.Root>,
    );
    const title = screen.getByRole('heading', { level: 3, name: 'Title' }).element();
    const header = title.parentElement;
    const root = header?.parentElement;
    const parts = [
      [root, 'DIV', 'root', 'contour-card'],
      [header, 'DIV', 'header', 'contour-card__header'],
      [screen.getByText('Body').element(), 'DIV', 'body', 'contour-card__body'],
      [screen.getByText('Footer').element(), 'DIV', 'footer', 'contour-card__footer'],
      [title, 'H3', 'title', 'contour-card__title'],
      [screen.getByText('Description').element(), 'P', 'description', 'contour-card__description'],
    ] as const;

    for (const [element, tagName, part, className] of parts) {
      expect(element?.tagName).toBe(tagName);
      expect(element).toHaveClass(className, { exact: true });
      expect(element).toHaveAttribute('data-scope', 'card');
      expect(element).toHaveAttribute('data-part', part);
    }
    // The defaults are rendered too, so CSS can select them.
    expect(root).toHaveAttribute('data-variant', 'outline');
    expect(root).toHaveAttribute('data-size', 'md');
  });

  it('is styled with semantic tokens', async () => {
    const screen = await render(
      <Card.Root>
        <Card.Body>
          <Card.Title>Title</Card.Title>
          <Card.Description>Description</Card.Description>
        </Card.Body>
      </Card.Root>,
    );
    const title = screen.getByRole('heading', { name: 'Title' });
    const root = title.element().closest('.contour-card');
    const surface = computed('background-color', vars.color.bg.surface);

    // The token resolves to a real color (tokens.css is loaded), and the stylesheet uses it.
    expect(surface).toMatch(/^oklch\(/u);
    expect(root).toHaveStyle({
      backgroundColor: surface,
      borderTopColor: computed('border-top-color', vars.color.border.default),
      borderTopStyle: 'solid',
      borderTopWidth: length(vars['border-width'].default),
      borderTopLeftRadius: length(vars.radius.panel),
      paddingTop: length(vars.space['panel-inset']),
      color: computed('color', vars.color.fg.default),
    });
    await expect.element(title).toHaveStyle({
      marginTop: '0px',
      marginBottom: '0px',
      color: computed('color', vars.color.fg.default),
      fontSize: computed('font-size', vars.text.heading.fontSize),
      fontWeight: computed('font-weight', vars.text.heading.fontWeight),
    });
    await expect.element(screen.getByText('Description')).toHaveStyle({
      marginTop: '0px',
      marginBottom: '0px',
      color: computed('color', vars.color.fg.muted),
      fontSize: computed('font-size', vars.text.body.fontSize),
    });
  });

  it('sets the padding and the gap between parts by size', async () => {
    const screen = await render(
      <>
        <Card.Root size="sm">sm</Card.Root>
        <Card.Root size="md">md</Card.Root>
        <Card.Root size="lg">lg</Card.Root>
      </>,
    );
    const expected = { sm: 'group-gap', md: 'panel-inset', lg: 'section-gap' } as const;

    for (const [size, space] of Object.entries(expected)) {
      const inset = length(vars.space[space]);
      expect(screen.getByText(size).element()).toHaveStyle({ paddingTop: inset, rowGap: inset });
    }
  });

  it('keeps the same box in every variant', async () => {
    const screen = await render(
      <div style={{ inlineSize: '240px' }}>
        <Card.Root variant="outline">outline</Card.Root>
        <Card.Root variant="subtle">subtle</Card.Root>
        <Card.Root variant="elevated">elevated</Card.Root>
      </div>,
    );
    const outline = screen.getByText('outline').element();
    const subtle = screen.getByText('subtle').element();
    const elevated = screen.getByText('elevated').element();

    expect(box(subtle)).toBe(box(outline));
    expect(box(elevated)).toBe(box(outline));
    expect(subtle).toHaveStyle({
      borderTopColor: 'rgba(0, 0, 0, 0)',
      backgroundColor: computed('background-color', vars.color.bg.surface),
      boxShadow: 'none',
    });
    expect(elevated).toHaveStyle({
      borderTopColor: computed('border-top-color', vars.color.border.default),
      backgroundColor: computed('background-color', vars.color.bg.raised),
      boxShadow: computed('box-shadow', vars.shadow.raised),
    });
  });

  it('passes props, class names and the ref through to the root', async () => {
    const ref = createRef<HTMLDivElement>();
    await render(
      <Card.Root ref={ref} className="mine" variant="subtle" size="lg" aria-label="Session">
        content
      </Card.Root>,
    );

    expect(ref.current).toHaveClass('contour-card mine', { exact: true });
    expect(ref.current).toHaveAttribute('aria-label', 'Session');
    expect(ref.current).toHaveAttribute('data-variant', 'subtle');
    expect(ref.current).toHaveAttribute('data-size', 'lg');
  });

  it('takes another heading level for the title with asChild', async () => {
    const screen = await render(
      <Card.Root>
        <Card.Title asChild>
          <h2>Kit</h2>
        </Card.Title>
      </Card.Root>,
    );
    const title = screen.getByRole('heading', { level: 2, name: 'Kit' });

    await expect.element(title).toHaveClass('contour-card__title');
    await expect.element(title).toHaveAttribute('data-part', 'title');
    await expect.element(title).toHaveStyle({
      marginTop: '0px',
      fontSize: computed('font-size', vars.text.heading.fontSize),
    });
  });

  it('lines up the footers of cards stretched to one row height', async () => {
    const screen = await render(
      <div style={{ display: 'grid', gridTemplateColumns: '120px 120px' }}>
        <Card.Root>
          <Card.Body>Short.</Card.Body>
          <Card.Footer>first</Card.Footer>
        </Card.Root>
        <Card.Root>
          <Card.Body>A body long enough to wrap onto several lines.</Card.Body>
          <Card.Footer>second</Card.Footer>
        </Card.Root>
      </div>,
    );
    const bottom = (text: string): number =>
      screen.getByText(text).element().getBoundingClientRect().bottom;

    expect(bottom('first')).toBe(bottom('second'));
  });

  it('hides any part with `hidden`, though each sets its display', async () => {
    const screen = await render(
      <Card.Root hidden>
        <Card.Header hidden />
        <Card.Body hidden />
        <Card.Footer hidden />
      </Card.Root>,
    );
    const parts = [...screen.container.querySelectorAll<HTMLElement>('[data-scope="card"]')];

    // The display of each part itself, whatever its ancestors show.
    expect(
      parts.map((part) => [part.dataset['part'], getComputedStyle(part).display]),
    ).toStrictEqual([
      ['root', 'none'],
      ['header', 'none'],
      ['body', 'none'],
      ['footer', 'none'],
    ]);
  });

  describe('with a link as the root', () => {
    it('is one link, named by its content with the title first', async () => {
      const screen = await render(<LinkCard />);
      const link = screen.getByRole('link', {
        name: 'Kit Styled general-purpose components.',
        exact: true,
      });

      expect(screen.getByRole('link').elements()).toHaveLength(1);
      await expect.element(link).toHaveClass('contour-card', { exact: true });
      await expect.element(link).toHaveAttribute('data-part', 'root');
      await expect.element(link).toHaveAttribute('href', '/docs/kit');
      await expect.element(link).toHaveStyle({
        color: computed('color', vars.color.fg.default),
        textDecorationLine: 'none',
        cursor: 'pointer',
      });
    });

    it('takes the hover colors on hover', async () => {
      const screen = await render(<LinkCard />);
      const link = screen.getByRole('link');

      await userEvent.hover(link);
      await expect.element(link).toHaveStyle({
        backgroundColor: computed('background-color', vars.color.bg.hover),
        borderTopColor: computed('border-top-color', vars.color.border.strong),
      });
    });

    it('shows the focus ring on keyboard focus', async () => {
      const screen = await render(<LinkCard />);
      const link = screen.getByRole('link');

      await userEvent.tab();
      await expect.element(link).toHaveFocus();
      await expect.element(link).toHaveStyle({
        outlineStyle: 'solid',
        outlineColor: computed('outline-color', vars.color.border.focus),
        outlineWidth: length(vars['border-width'].focus),
        outlineOffset: length(vars['border-width'].focus),
      });
    });
  });

  describe('with a button as the root', () => {
    it('fills its container and keeps the text at the start', async () => {
      const screen = await render(
        <div style={{ inlineSize: '240px' }}>
          <Card.Root asChild>
            <button type="button">Open session</button>
          </Card.Root>
        </div>,
      );
      const button = screen.getByRole('button', { name: 'Open session' });

      await expect.element(button).toHaveClass('contour-card');
      await expect.element(button).toHaveStyle({
        width: '240px',
        textAlign: 'start',
        cursor: 'pointer',
      });
    });

    it('is not interactive while disabled', async () => {
      const screen = await render(
        // No transition, so a hover background would show at once.
        <Card.Root asChild style={{ transition: 'none' }}>
          <button type="button" disabled>
            Unavailable
          </button>
        </Card.Root>,
      );
      const button = screen.getByRole('button', { name: 'Unavailable' });

      await userEvent.hover(button);
      await expect.element(button).toHaveStyle({
        cursor: 'default',
        backgroundColor: computed('background-color', vars.color.bg.surface),
      });
    });
  });
});
