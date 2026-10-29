import { createRef } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { Primitive } from './primitive.ts';

/** A router-like link: a component that passes its props and `ref` on to `<a>`. */
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

describe('Primitive', () => {
  it('renders each element under its own name', () => {
    for (const [element, Component] of Object.entries(Primitive)) {
      expect(renderToStaticMarkup(<Component />)).toMatch(new RegExp(`^<${element}[ />]`, 'u'));
    }
  });

  it('renders its element with the given props and ref', async () => {
    const ref = createRef<HTMLButtonElement>();
    const screen = await render(
      <Primitive.button
        ref={ref}
        type="button"
        className="trigger"
        data-state="open"
        asChild={false}
      >
        Open
      </Primitive.button>,
    );
    const button = screen.getByRole('button', { name: 'Open' });

    await expect.element(button).toHaveAttribute('class', 'trigger');
    await expect.element(button).toHaveAttribute('data-state', 'open');
    expect(ref.current).toBe(button.element());
  });

  describe('asChild', () => {
    it('renders the child in place of its element', async () => {
      const screen = await render(
        <Primitive.button asChild>
          <a href="/docs">Docs</a>
        </Primitive.button>,
      );

      await expect
        .element(screen.getByRole('link', { name: 'Docs' }))
        .toHaveAttribute('href', '/docs');
      await expect.element(screen.getByRole('button')).not.toBeInTheDocument();
    });

    it('merges its props into the child', async () => {
      const calls: string[] = [];
      const screen = await render(
        <Primitive.button
          asChild
          id="part"
          className="part"
          style={{ color: 'red', margin: '1px' }}
          data-state="open"
          aria-expanded="true"
          onClick={() => {
            calls.push('part');
          }}
        >
          <a
            href="/docs"
            id="child"
            className="child"
            style={{ color: 'blue' }}
            onClick={(event) => {
              event.preventDefault();
              calls.push('child');
            }}
          >
            Docs
          </a>
        </Primitive.button>,
      );
      const link = screen.getByRole('link', { name: 'Docs' });
      const { style } = link.element();

      await expect.element(link).toHaveAttribute('class', 'part child');
      expect([style.color, style.margin]).toStrictEqual(['blue', '1px']);
      await expect.element(link).toHaveAttribute('data-state', 'open');
      await expect.element(link).toHaveAttribute('aria-expanded', 'true');
      await expect.element(link).toHaveAttribute('id', 'child');

      await link.click();

      expect(calls).toStrictEqual(['child', 'part']);
    });

    it('gives its ref and the child ref the same node, and detaches both', async () => {
      const ref = createRef<HTMLButtonElement>();
      const childCleanup = vi.fn<() => void>();
      const childRef = vi.fn<(node: HTMLAnchorElement | null) => () => void>(() => childCleanup);
      const screen = await render(
        <Primitive.button asChild ref={ref}>
          <a href="/docs" ref={childRef}>
            Docs
          </a>
        </Primitive.button>,
      );
      const link = screen.getByRole('link', { name: 'Docs' }).element();

      expect(ref.current).toBe(link);
      expect(childRef).toHaveBeenCalledExactlyOnceWith(link);

      await screen.unmount();

      expect(ref.current).toBeNull();
      expect(childCleanup).toHaveBeenCalledOnce();
    });

    it('works with a component child that passes props and ref on', async () => {
      const ref = createRef<HTMLAnchorElement>();
      const screen = await render(
        <Primitive.a asChild ref={ref} className="link">
          <RouterLink to="/guide">Guide</RouterLink>
        </Primitive.a>,
      );
      const link = screen.getByRole('link', { name: 'Guide' });

      await expect.element(link).toHaveAttribute('href', '/guide');
      await expect.element(link).toHaveAttribute('class', 'link');
      expect(ref.current).toBe(link.element());
    });

    it('throws unless the children are exactly one element', async () => {
      const message =
        'Primitive.span: with `asChild`, the children must be exactly one React element';

      await expect(render(<Primitive.span asChild>text</Primitive.span>)).rejects.toThrow(message);
      await expect(
        render(
          <Primitive.span asChild>
            <>
              <b>one</b>
              <i>two</i>
            </>
          </Primitive.span>,
        ),
      ).rejects.toThrow(message);
      await expect(
        render(
          <Primitive.span asChild>
            <b>one</b>
            <i>two</i>
          </Primitive.span>,
        ),
      ).rejects.toThrow(message);
    });
  });
});
