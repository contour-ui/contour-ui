import { cloneElement, createElement, Fragment, isValidElement } from 'react';
import type { HTMLAttributes, JSX, ReactElement, ReactNode, Ref } from 'react';

import { useComposedRefs } from './compose-refs.ts';
import { mergeProps } from './merge-props.ts';

/**
 * Elements that {@link Primitive} renders: the ones contour-ui parts are made of
 * (roots and contents, triggers, links, titles, list items, table parts…). A
 * part that needs another element adds it here.
 */
export type PrimitiveElement =
  | 'a'
  | 'button'
  | 'caption'
  | 'div'
  | 'figcaption'
  | 'figure'
  | 'h2'
  | 'h3'
  | 'input'
  | 'kbd'
  | 'label'
  | 'li'
  | 'nav'
  | 'p'
  | 'span'
  | 'table'
  | 'tbody'
  | 'td'
  | 'tfoot'
  | 'th'
  | 'thead'
  | 'tr'
  | 'ul';

interface AsChildProps {
  /**
   * Render the only child instead of the default element, with these props
   * merged into the child's (see {@link mergeProps}): event handlers all run,
   * the child's first; class names are joined; styles are merged; for anything
   * else the child's value wins. This `ref` and the child's `ref` both receive
   * the DOM node.
   *
   * The child must be exactly one React element (not text, a fragment or a
   * list), otherwise rendering throws. A component child must pass the props
   * and the `ref` it gets on to its DOM element.
   *
   * @defaultValue false
   */
  asChild?: boolean | undefined;
}

/** Props of `Primitive.<element>`: the element's own props, `ref` included, plus `asChild`. */
export type PrimitiveProps<E extends PrimitiveElement> = JSX.IntrinsicElements[E] & AsChildProps;

type PrimitiveComponent<E extends PrimitiveElement> = (props: PrimitiveProps<E>) => ReactElement;

type PrimitiveComponents = { readonly [E in PrimitiveElement]: PrimitiveComponent<E> };

/** The props of any primitive, as the shared implementation reads them. */
interface AnyPrimitiveProps extends HTMLAttributes<HTMLElement>, AsChildProps {
  ref?: Ref<HTMLElement> | undefined;
}

/** What `asChild` reads from the child's props besides passing them on: its ref. */
interface ChildProps {
  ref?: Ref<unknown> | undefined;
}

function onlyChild(children: ReactNode, name: string): ReactElement<ChildProps> {
  if (isValidElement<ChildProps>(children) && children.type !== Fragment) {
    return children;
  }
  throw new Error(
    `${name}: with \`asChild\`, the children must be exactly one React element (not text, a fragment or a list).`,
  );
}

function createPrimitive<E extends PrimitiveElement>(element: E): PrimitiveComponent<E> {
  const name = `Primitive.${element}`;

  function Component({ asChild = false, children, ...props }: AnyPrimitiveProps): ReactElement {
    const child = asChild ? onlyChild(children, name) : undefined;
    const ref = useComposedRefs<unknown>(props.ref, child?.props.ref);

    if (child === undefined) {
      return createElement(element, props, children);
    }
    // The merged props carry the child's ref (it comes last); replace it with both refs.
    return cloneElement(child, { ...mergeProps(props, child.props), ref });
  }

  Component.displayName = name;
  return Component;
}

/**
 * Unstyled DOM elements that parts render through: `Primitive.div`,
 * `Primitive.button` and the rest of {@link PrimitiveElement}. Each renders its
 * element with the given props and `ref`, or, with `asChild`, the only child
 * element with the props merged into it, e.g. a router link in place of `<a>`.
 *
 * @example
 * <Primitive.button asChild className="trigger" onClick={toggle}>
 *   <a href="/docs">Docs</a>
 * </Primitive.button>
 * // renders <a href="/docs" class="trigger"> that calls `toggle` on click
 */
export const Primitive: PrimitiveComponents = {
  a: createPrimitive('a'),
  button: createPrimitive('button'),
  caption: createPrimitive('caption'),
  div: createPrimitive('div'),
  figcaption: createPrimitive('figcaption'),
  figure: createPrimitive('figure'),
  h2: createPrimitive('h2'),
  h3: createPrimitive('h3'),
  input: createPrimitive('input'),
  kbd: createPrimitive('kbd'),
  label: createPrimitive('label'),
  li: createPrimitive('li'),
  nav: createPrimitive('nav'),
  p: createPrimitive('p'),
  span: createPrimitive('span'),
  table: createPrimitive('table'),
  tbody: createPrimitive('tbody'),
  td: createPrimitive('td'),
  tfoot: createPrimitive('tfoot'),
  th: createPrimitive('th'),
  thead: createPrimitive('thead'),
  tr: createPrimitive('tr'),
  ul: createPrimitive('ul'),
};
