/*
 * The types of the web build: what `Primitive.*` takes and gives on React DOM, the events its
 * handlers receive and what the services hand over. The web is permissive: every element takes
 * everything React DOM takes for its tag, and `asChild`. Shared code is held to the shared
 * vocabulary by the type check of the Soundor build, where web-only props do not compile.
 */
import type {
  CSSProperties,
  DOMAttributes,
  FocusEvent,
  JSX,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactElement,
  RefCallback,
} from 'react';

import type { SharedElement, WebOnlyElement } from '../shared/elements.ts';
import type { InteractionStore } from '../shared/interaction.ts';

/**
 * The elements of the web build: the shared ones, which every build has, and the elements of the
 * parts that run on the web alone so far (`a`, `h2`, `li`, `table`, `input`…).
 */
export type PrimitiveElement = SharedElement | WebOnlyElement;

/** The DOM tag of an element: its own name, but `text` (a `<span>`) and `formValue` (an `<input>`). */
type TagOf<E extends PrimitiveElement> = E extends 'text'
  ? 'span'
  : E extends 'formValue'
    ? 'input'
    : E;

/** What every element takes on the web besides the props of its tag. */
interface AsChildProps {
  /**
   * Render the only child instead of the default element, with these props merged into the
   * child's (see `mergeProps`): event handlers all run, the child's first; class names are
   * joined; styles are merged; for anything else the child's value wins. This `ref` and the
   * child's `ref` both receive the DOM node.
   *
   * The child must be exactly one React element (not text, a fragment or a list), otherwise
   * rendering throws. A component child must pass the props and the `ref` it gets on to its DOM
   * element. Web only: shared code cannot use it.
   *
   * @defaultValue false
   */
  asChild?: boolean | undefined;
}

/** The props of the pressable beyond those of `<button>`. */
interface PressProps {
  /**
   * The element was pressed: a click of a pointer, Enter or Space, or the activation of assistive
   * technology, which all reach the element as a `click`. Called after `onClick`, so that shared
   * code, which has no `onClick`, and the web's own handlers can both listen.
   */
  onPress?: ((event: PrimitivePressEvent) => void) | undefined;
}

/** The props of the elements whose props are not simply those of their tag. */
interface OwnProps {
  readonly button: JSX.IntrinsicElements['button'] & PressProps;
  /** An `<input type="hidden">`: every prop of an input passes but `type`. */
  readonly formValue: Omit<JSX.IntrinsicElements['input'], 'type'>;
}

/**
 * The props of `Primitive.<element>` on the web: everything React DOM takes for its tag, `ref`
 * included, and `asChild`; the pressable adds `onPress`.
 */
export type PrimitiveProps<E extends PrimitiveElement> = (E extends keyof OwnProps
  ? OwnProps[E]
  : JSX.IntrinsicElements[TagOf<E>]) &
  AsChildProps;

/** A component of {@link PrimitiveComponents}: on the web, it always renders its element. */
export type PrimitiveComponent<E extends PrimitiveElement> = (
  props: PrimitiveProps<E>,
) => ReactElement;

/** The elements of the web build, by name: the type of `Primitive`. */
export type PrimitiveComponents = { readonly [E in PrimitiveElement]: PrimitiveComponent<E> };

/** The DOM node of a tag: SVG for the vector shapes, HTML for the rest. */
type NodeOf<Tag> = Tag extends 'svg' | 'path' | 'line'
  ? SVGElementTagNameMap[Tag]
  : Tag extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[Tag]
    : never;

/**
 * The node a ref of `Primitive.<element>` receives: on the web, the DOM element of its tag
 * (`HTMLButtonElement`, `SVGSVGElement`, a `HTMLSpanElement` for `text`, a `HTMLInputElement` for
 * `formValue`).
 */
export type PrimitiveNode<E extends PrimitiveElement> = NodeOf<TagOf<E>>;

/** A pointer event, as the handlers of an element receive it: React's, on the web. */
export type PrimitivePointerEvent = PointerEvent;

/** A keyboard event, as the handlers of an element receive it: React's, on the web. */
export type PrimitiveKeyboardEvent = KeyboardEvent;

/** A focus event, as the handlers of an element receive it: React's, on the web. */
export type PrimitiveFocusEvent = FocusEvent;

/**
 * What `onPress` receives: on the web, the `click` of the press, whatever made it (a pointer,
 * Enter or Space, assistive technology).
 */
export type PrimitivePressEvent = MouseEvent;

/**
 * The props a service hands over, to spread on the element it serves (`Primitive.div`,
 * `Primitive.svg`, `Primitive.button`) through `mergeProps`: React's event handlers, and a `style`
 * for what input needs from the element (`touch-action` of a drag).
 */
export interface ServiceProps extends Omit<
  DOMAttributes<Element>,
  'children' | 'dangerouslySetInnerHTML'
> {
  readonly style?: CSSProperties | undefined;
}

/**
 * What a service returns: the props to merge into its element, and a ref for what React props
 * cannot do (a listener React would add passively), to compose with the element's other refs
 * (`useComposedRefs`). `undefined` when the service needs no node.
 */
export interface ServiceResult {
  readonly props: ServiceProps;
  readonly ref: RefCallback<Element> | undefined;
}

/** What `useInteraction` returns: the store of the element's state, and what feeds it. */
export interface InteractionResult extends ServiceResult {
  /**
   * The interaction state of the element. A store at rest stands in for it while the element is
   * disabled, so read the store of the latest render.
   */
  readonly store: InteractionStore;
}

/** The props `useStyleState` hands over on the web: none, since CSS styles the state there. */
// oxlint-disable-next-line typescript/no-generated-empty-object-type -- no props, on purpose.
export type StyleStateProps = Readonly<Record<never, never>>;
