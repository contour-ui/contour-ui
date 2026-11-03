import { createRef } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Primitive } from './primitive.ts';
import type { PrimitiveNode, PrimitivePressEvent } from './types.ts';

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

/** The DOM tag of the elements not named after it. */
const TAGS: Readonly<Record<string, string>> = { text: 'span', formValue: 'input' };

/** Every element with the tag it renders. */
const ELEMENTS = Object.entries(Primitive).map(([element, Component]) => ({
  element,
  tag: TAGS[element] ?? element,
  Component,
}));

/** The form of a render. */
function formOf(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form');
  if (form === null) {
    throw new Error('No form.');
  }
  return form;
}

describe('Primitive', () => {
  it.each(ELEMENTS)('renders $element as <$tag>', ({ tag, Component }) => {
    expect(renderToStaticMarkup(<Component />)).toMatch(new RegExp(`^<${tag}[ />]`, 'u'));
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

  it('renders the SVG elements in the SVG namespace, with their props and ref', async () => {
    const ref = createRef<SVGPathElement>();
    const screen = await render(
      <Primitive.svg viewBox="0 0 10 10" data-testid="dial">
        <Primitive.path ref={ref} d="M 1 1 L 9 9" strokeWidth={2} />
        <Primitive.line asChild className="part">
          <line x1={0} y1={0} x2={5} y2={5} className="child" />
        </Primitive.line>
      </Primitive.svg>,
    );
    const svg = screen.getByTestId('dial').element();

    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    await expect.element(screen.getByTestId('dial')).toHaveAttribute('viewBox', '0 0 10 10');
    expect(ref.current).toBeInstanceOf(SVGPathElement);
    expect(ref.current).toHaveAttribute('stroke-width', '2');
    expect(svg.querySelector('line')).toHaveAttribute('class', 'part child');
  });

  it('renders text as a span', async () => {
    const ref = createRef<HTMLSpanElement>();
    const screen = await render(
      <Primitive.text ref={ref} className="label" data-part="label">
        Save {3} items
      </Primitive.text>,
    );
    const text = screen.getByText('Save 3 items').element();

    expect(text.tagName).toBe('SPAN');
    expect(text).toHaveAttribute('class', 'label');
    expect(text).toHaveAttribute('data-part', 'label');
    expect(ref.current).toBe(text);
  });

  it('types the node of each element as its DOM element', () => {
    expectTypeOf<PrimitiveNode<'div'>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<PrimitiveNode<'span'>>().toEqualTypeOf<HTMLSpanElement>();
    expectTypeOf<PrimitiveNode<'text'>>().toEqualTypeOf<HTMLSpanElement>();
    expectTypeOf<PrimitiveNode<'button'>>().toEqualTypeOf<HTMLButtonElement>();
    expectTypeOf<PrimitiveNode<'svg'>>().toEqualTypeOf<SVGSVGElement>();
    expectTypeOf<PrimitiveNode<'path'>>().toEqualTypeOf<SVGPathElement>();
    expectTypeOf<PrimitiveNode<'line'>>().toEqualTypeOf<SVGLineElement>();
    expectTypeOf<PrimitiveNode<'formValue'>>().toEqualTypeOf<HTMLInputElement>();
    expectTypeOf<PrimitiveNode<'a'>>().toEqualTypeOf<HTMLAnchorElement>();
  });

  describe('button', () => {
    it('is a button of type button unless given another type', async () => {
      const screen = await render(
        <form>
          <Primitive.button>Plain</Primitive.button>
          <Primitive.button type="submit">Send</Primitive.button>
        </form>,
      );

      await expect
        .element(screen.getByRole('button', { name: 'Plain' }))
        .toHaveAttribute('type', 'button');
      await expect
        .element(screen.getByRole('button', { name: 'Send' }))
        .toHaveAttribute('type', 'submit');
    });

    it('calls onPress after onClick, for a click, Enter and Space', async () => {
      const calls: string[] = [];
      const targets: Array<EventTarget | null> = [];
      const screen = await render(
        <Primitive.button
          onClick={() => {
            calls.push('click');
          }}
          onPress={(event) => {
            calls.push('press');
            targets.push(event.currentTarget);
          }}
        >
          Save
        </Primitive.button>,
      );
      const button = screen.getByRole('button', { name: 'Save' });

      await userEvent.click(button);
      expect(calls).toStrictEqual(['click', 'press']);
      expect(targets).toStrictEqual([button.element()]);

      button.element().focus();
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      expect(calls).toStrictEqual(['click', 'press', 'click', 'press', 'click', 'press']);
    });

    it('stays still while disabled', async () => {
      const onPress = vi.fn<(event: PrimitivePressEvent) => void>();
      const screen = await render(
        <Primitive.button disabled onPress={onPress}>
          Save
        </Primitive.button>,
      );
      const button = screen.getByRole('button', { name: 'Save' });

      await expect.element(button).toBeDisabled();
      // Playwright waits for a disabled element to turn enabled before it clicks it.
      await userEvent.click(button, { force: true });
      expect(onPress).not.toHaveBeenCalled();
    });

    it('presses its asChild element, which keeps its own type', async () => {
      const targets: Array<EventTarget | null> = [];
      const screen = await render(
        <Primitive.button
          asChild
          onPress={(event) => {
            event.preventDefault();
            targets.push(event.currentTarget);
          }}
        >
          <a href="#pressed">Docs</a>
        </Primitive.button>,
      );
      const link = screen.getByRole('link', { name: 'Docs' });

      await expect.element(link).not.toHaveAttribute('type');
      await userEvent.click(link);
      expect(targets).toStrictEqual([link.element()]);
    });

    it('turns a disabled asChild element inert: aria-disabled, no default, no handlers', async () => {
      const calls: string[] = [];
      const screen = await render(
        <Primitive.button
          asChild
          disabled
          onClick={() => {
            calls.push('click');
          }}
          onPress={() => {
            calls.push('press');
          }}
        >
          <a
            href="#navigated"
            onClick={() => {
              calls.push('child');
            }}
          >
            Docs
          </a>
        </Primitive.button>,
      );
      const link = screen.getByRole('link', { name: 'Docs' });
      const { hash } = location;

      await expect.element(link).toHaveAttribute('aria-disabled', 'true');
      await expect.element(link).not.toHaveAttribute('disabled');
      await userEvent.click(link, { force: true });
      link.element().focus();
      await userEvent.keyboard('{Enter}');

      expect(calls).toStrictEqual([]);
      expect(location.hash).toBe(hash);
    });
  });

  describe('formValue', () => {
    it('renders a hidden input that a form submits', async () => {
      const ref = createRef<HTMLInputElement>();
      const screen = await render(
        <form>
          <Primitive.formValue ref={ref} name="gain" value="12.5" data-part="hidden-input" />
        </form>,
      );
      const form = formOf(screen.container);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveAttribute('type', 'hidden');
      expect(ref.current).toHaveAttribute('data-part', 'hidden-input');
      expect(new FormData(form).get('gain')).toBe('12.5');

      await screen.rerender(
        <form>
          <Primitive.formValue ref={ref} name="gain" value="12.5" disabled />
        </form>,
      );
      expect(new FormData(form).has('gain')).toBe(false);
    });

    it('stays hidden whatever type it is given', () => {
      // The props of the form value have no `type`: only code that bypasses the types sets one.
      const props: ComponentProps<typeof Primitive.formValue> = { name: 'gain', value: '1' };
      const markup = renderToStaticMarkup(<Primitive.formValue {...props} {...{ type: 'text' }} />);

      expect(markup).toContain('type="hidden"');
      expect(markup).not.toContain('type="text"');
    });

    it('belongs to the form it names', async () => {
      const screen = await render(
        <>
          <form id="preset" />
          <Primitive.formValue name="gain" form="preset" value="3" />
        </>,
      );

      expect(new FormData(formOf(screen.container)).get('gain')).toBe('3');
    });
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
      await expect(
        render(
          <Primitive.button asChild>
            <b>one</b>
            <i>two</i>
          </Primitive.button>,
        ),
      ).rejects.toThrow('Primitive.button: with `asChild`');
    });
  });
});
