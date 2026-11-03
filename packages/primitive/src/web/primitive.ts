import { cloneElement, createElement, Fragment, isValidElement } from 'react';
import type { DOMAttributes, MouseEvent, ReactElement, ReactNode, Ref } from 'react';

import { useComposedRefs } from '../shared/compose-refs.ts';
import { mergeProps } from './merge-props.ts';
import type { PrimitiveComponents, PrimitiveElement, PrimitivePressEvent } from './types.ts';

/**
 * The props of any element, HTML or SVG, as the implementation reads them: it only passes them
 * on, besides `asChild`, `children` and `ref`.
 */
interface AnyPrimitiveProps extends DOMAttributes<Element> {
  asChild?: boolean | undefined;
  ref?: Ref<Element> | undefined;
}

/** What the pressable reads besides passing the props on. */
interface ButtonProps extends AnyPrimitiveProps {
  onPress?: ((event: PrimitivePressEvent) => void) | undefined;
  disabled?: boolean | undefined;
  type?: 'submit' | 'reset' | 'button' | undefined;
}

/** What `asChild` reads from the child's props besides passing them on: its ref. */
interface ChildProps {
  ref?: Ref<unknown> | undefined;
}

/** The `type` of the form value: always hidden, last so that it wins. */
const HIDDEN = { type: 'hidden' } as const;

function onlyChild(children: ReactNode, name: string): ReactElement<ChildProps> {
  if (isValidElement<ChildProps>(children) && children.type !== Fragment) {
    return children;
  }
  throw new Error(
    `${name}: with \`asChild\`, the children must be exactly one React element (not text, a fragment or a list).`,
  );
}

/**
 * Render the DOM element `tag` with `props`, or, with `asChild`, the only child with `props`
 * merged into it. A hook (it composes the refs), called by every element.
 */
function useElement(
  name: string,
  tag: string,
  { asChild = false, children, ...props }: AnyPrimitiveProps,
): ReactElement {
  const child = asChild ? onlyChild(children, name) : undefined;
  const ref = useComposedRefs<unknown>(props.ref, child?.props.ref);

  if (child === undefined) {
    return createElement(tag, props, children);
  }
  // The merged props carry the child's ref (it comes last); replace it with both refs.
  return cloneElement(child, { ...mergeProps(props, child.props), ref });
}

/** An element whose props pass to its tag as they are. */
function createPrimitive(
  element: PrimitiveElement,
  tag: string,
): (props: AnyPrimitiveProps) => ReactElement {
  const name = `Primitive.${element}`;

  function Component(props: AnyPrimitiveProps): ReactElement {
    return useElement(name, tag, props);
  }

  Component.displayName = name;
  return Component;
}

/**
 * A click on a disabled `asChild` element: no default action (a link does not navigate) and no
 * click handlers, as a click on a disabled `<button>`. Stopped in the capture phase, so the
 * handlers of the element never run.
 */
function ignoreClick(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * The pressable: a `<button type="button">` unless given another `type`, which calls `onPress` on
 * every click after `onClick`. With `asChild` it keeps the child's own type, and `disabled` turns
 * into `aria-disabled`, with its clicks stopped, since only form controls take `disabled`.
 */
function PrimitiveButton({ onPress, disabled, type, ...props }: ButtonProps): ReactElement {
  const asChild = props.asChild === true;
  const inert = asChild && disabled === true;
  const own = {
    type: asChild ? type : (type ?? 'button'),
    disabled: asChild ? undefined : disabled,
    'aria-disabled': inert ? true : undefined,
    onClickCapture: inert ? ignoreClick : undefined,
    onClick:
      onPress === undefined
        ? undefined
        : (event: MouseEvent) => {
            onPress(event);
          },
  };
  // The user's handlers come later, so they run first: `onClick` before `onPress`.
  return useElement('Primitive.button', 'button', mergeProps(own, props));
}

PrimitiveButton.displayName = 'Primitive.button';

/** The form value: an `<input type="hidden">`, whatever `type` it is given. */
function PrimitiveFormValue(props: AnyPrimitiveProps): ReactElement {
  return useElement('Primitive.formValue', 'input', mergeProps(props, HIDDEN));
}

PrimitiveFormValue.displayName = 'Primitive.formValue';

/**
 * The elements parts are made of, on React DOM: `Primitive.div`, `Primitive.button` and the
 * rest of `PrimitiveElement`. Each renders its element with the given props and `ref` as they
 * are, or, with `asChild`, the only child element with the props merged into it, e.g. a router
 * link in place of `<a>`. `Primitive.text` renders a `<span>`, `Primitive.formValue` an
 * `<input type="hidden">`; `Primitive.button` takes `onPress`.
 *
 * Shared code uses the shared elements (`div`, `span`, `text`, `button`, `svg`, `path`, `line`,
 * `formValue`) with the shared vocabulary; the others exist on the web only.
 *
 * @example
 * <Primitive.button asChild className="trigger" onPress={toggle}>
 *   <a href="/docs">Docs</a>
 * </Primitive.button>
 * // renders <a href="/docs" class="trigger"> that calls `toggle` on click
 */
export const Primitive: PrimitiveComponents = {
  div: createPrimitive('div', 'div'),
  span: createPrimitive('span', 'span'),
  text: createPrimitive('text', 'span'),
  button: PrimitiveButton,
  svg: createPrimitive('svg', 'svg'),
  path: createPrimitive('path', 'path'),
  line: createPrimitive('line', 'line'),
  formValue: PrimitiveFormValue,
  a: createPrimitive('a', 'a'),
  caption: createPrimitive('caption', 'caption'),
  figcaption: createPrimitive('figcaption', 'figcaption'),
  figure: createPrimitive('figure', 'figure'),
  h2: createPrimitive('h2', 'h2'),
  h3: createPrimitive('h3', 'h3'),
  input: createPrimitive('input', 'input'),
  kbd: createPrimitive('kbd', 'kbd'),
  label: createPrimitive('label', 'label'),
  li: createPrimitive('li', 'li'),
  nav: createPrimitive('nav', 'nav'),
  p: createPrimitive('p', 'p'),
  table: createPrimitive('table', 'table'),
  tbody: createPrimitive('tbody', 'tbody'),
  td: createPrimitive('td', 'td'),
  tfoot: createPrimitive('tfoot', 'tfoot'),
  th: createPrimitive('th', 'th'),
  thead: createPrimitive('thead', 'thead'),
  tr: createPrimitive('tr', 'tr'),
  ul: createPrimitive('ul', 'ul'),
};
