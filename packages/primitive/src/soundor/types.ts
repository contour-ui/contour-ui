/*
 * The types of the Soundor build: the shared vocabulary with Soundor's event types, plus the own
 * props of each Soundor component, minus what the translation replaces. Shared code compiles
 * against these and against the web build's (`vp run typecheck:platforms`): a web-only prop
 * (`className`, `asChild`, `onClick`) fails here, a Soundor-only prop fails there.
 */
import type {
  AccessibilityActionInfo,
  PressableProps,
  StyleProp,
  TextProps,
  ViewProps,
} from '@soundor/react';
import type { LineProps, PathProps, SvgProps } from '@soundor/react/svg';
import type {
  AccessibilityActionEvent,
  FocusEvent,
  KeyboardEvent,
  PointerEvent,
  UiNode,
  WheelEvent,
} from 'soundor:ui';
import type { ReactElement, ReactNode, Ref, RefCallback } from 'react';

import type { ElementRole, SharedAriaProps, SharedEvent } from '../shared/compat.ts';
import type { SharedElement } from '../shared/elements.ts';
import type { InteractionStore } from '../shared/interaction.ts';

/** The elements of the Soundor build: the shared ones. Web-only elements have no Soundor twin. */
export type PrimitiveElement = SharedElement;

/** The elements with a node of their own on Soundor: all but the shapes and the form value. */
export type NodeElement = 'div' | 'span' | 'text' | 'button' | 'svg';

/** A pointer event of a node: a press, a move, a release, the pointer coming over or leaving. */
export type PrimitivePointerEvent = PointerEvent;

/** A key going down or up while a node, or one inside it, has the focus. */
export type PrimitiveKeyboardEvent = KeyboardEvent;

/**
 * A node taking or losing the focus. On Soundor it says whether the node shows its focus
 * (`focusVisible`), which the web has no field for: shared code reads it through `useInteraction`.
 */
export type PrimitiveFocusEvent = FocusEvent;

/** A press of `Primitive.button`: a click, Enter or Space, or assistive technology's "activate". */
export type PrimitivePressEvent = PointerEvent | KeyboardEvent | AccessibilityActionEvent;

/** The event each shared event prop is called with on Soundor. */
interface SharedEventTypes {
  readonly onPointerDown: PointerEvent;
  readonly onPointerMove: PointerEvent;
  readonly onPointerUp: PointerEvent;
  readonly onPointerCancel: PointerEvent;
  readonly onPointerEnter: PointerEvent;
  readonly onPointerLeave: PointerEvent;
  readonly onContextMenu: PointerEvent;
  readonly onKeyDown: KeyboardEvent;
  readonly onKeyUp: KeyboardEvent;
  readonly onFocus: FocusEvent;
  readonly onBlur: FocusEvent;
}

/** The shared event props, with Soundor's events, `undefined` allowed as React DOM allows it. */
export type SharedEventProps = {
  readonly [Name in SharedEvent]?: ((event: SharedEventTypes[Name]) => void) | undefined;
};

/**
 * The props of a Soundor component the shared vocabulary replaces: the accessibility props
 * (written as `role` and `aria-*`), `focusable` (`tabIndex`), the shared events (typed above),
 * `ref` and `children` (typed below), and `onClick`, which on Soundor is a press of the pointer
 * only: a press of `Primitive.button` is `onPress`, which keys and assistive technology make too.
 */
type Replaced =
  | 'accessible'
  | 'accessibilityRole'
  | 'accessibilityLabel'
  | 'accessibilityHint'
  | 'accessibilityState'
  | 'accessibilityValue'
  | 'focusable'
  | 'onClick'
  | 'onClickCapture'
  | 'ref'
  | 'children'
  | SharedEvent;

/**
 * The own props of a Soundor component as an element takes them: each may be `undefined`, as every
 * prop of React DOM may, so shared code that passes one through compiles on both builds. The
 * backend leaves `undefined` out: none reaches the component.
 */
type Own<Props> = { readonly [Key in keyof Props]?: Props[Key] | undefined };

/** The shared vocabulary of an element with a node: what shared parts write. */
export interface SharedNodeProps<E extends NodeElement> extends SharedAriaProps, SharedEventProps {
  /** Other elements point at it by this id (`aria-labelledby`); Soundor nodes have no id. */
  readonly id?: string | undefined;
  /** An ARIA role of the element's roles, translated (`slider` → `adjustable`). */
  readonly role?: ElementRole<E> | undefined;
  /** `0` or more: the element takes focus; none or a negative one: it does not. */
  readonly tabIndex?: number | undefined;
  readonly children?: ReactNode;
  /** The element's `soundor:ui` node. */
  readonly ref?: Ref<UiNode> | undefined;
}

/** The ambient text style of a box or the pressable (Soundor only). */
export interface TextStyleProps {
  /**
   * The style of the text inside: the runs of strings and numbers the element wraps in a `Text`,
   * and every `Primitive.text` below it, take it before their own `style` (a nearer one wins).
   * Keep it given, or not, for the life of the element: adding or dropping it mounts the
   * element's content again.
   */
  readonly textStyle?: StyleProp | undefined;
}

/** `Primitive.div`: a `View`. */
export interface PrimitiveDivProps
  extends SharedNodeProps<'div'>, Own<Omit<ViewProps, Replaced>>, TextStyleProps {}

/** `Primitive.span`: a `View` too (a `span` often holds an icon, so it is a box, not text). */
export interface PrimitiveSpanProps
  extends SharedNodeProps<'span'>, Own<Omit<ViewProps, Replaced>>, TextStyleProps {}

/** `Primitive.text`: a `Text`, a leaf of strings, numbers and other `Primitive.text`. */
export interface PrimitiveTextProps
  extends SharedNodeProps<'text'>, Own<Omit<TextProps, Replaced>> {}

/** `Primitive.button`: a `Pressable`. */
export interface PrimitiveButtonProps
  extends
    SharedNodeProps<'button'>,
    Own<Omit<PressableProps, Replaced | 'onPress' | 'disabled'>>,
    TextStyleProps {
  /** A press: a click, Enter or Space while focused, or assistive technology's "activate". */
  readonly onPress?: ((event: PrimitivePressEvent) => void) | undefined;
  /**
   * No presses, no focus, disabled to assistive technology. A focused button that turns
   * disabled gives its focus up, as on the web.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
}

/** `Primitive.svg`: an `Svg` of `@soundor/react/svg`, the only node of a vector scene. */
export interface PrimitiveSvgProps extends SharedNodeProps<'svg'>, Own<Omit<SvgProps, Replaced>> {}

/** `Primitive.path`: a `Path`, with presentation props only: no node, ref or events. */
export interface PrimitivePathProps extends Own<PathProps> {}

/** `Primitive.line`: a `Line`, with presentation props only: no node, ref or events. */
export interface PrimitiveLineProps extends Own<LineProps> {}

/** `Primitive.formValue`: the value of a form, which Soundor has no forms for: it renders nothing. */
export interface PrimitiveFormValueProps {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly form?: string | undefined;
  readonly value?: string | number | readonly string[] | undefined;
  readonly disabled?: boolean | undefined;
}

/** The props of each element on Soundor. */
export interface PrimitivePropsMap {
  readonly div: PrimitiveDivProps;
  readonly span: PrimitiveSpanProps;
  readonly text: PrimitiveTextProps;
  readonly button: PrimitiveButtonProps;
  readonly svg: PrimitiveSvgProps;
  readonly path: PrimitivePathProps;
  readonly line: PrimitiveLineProps;
  readonly formValue: PrimitiveFormValueProps;
}

/** The props of `Primitive.<element>` on Soundor. */
export type PrimitiveProps<E extends PrimitiveElement> = PrimitivePropsMap[E];

/**
 * What a ref of `Primitive.<element>` receives: the element's `soundor:ui` node. The shapes and
 * the form value have none.
 */
export type PrimitiveNode<E extends PrimitiveElement> = E extends NodeElement ? UiNode : never;

/** A component of {@link PrimitiveComponents}. */
export type PrimitiveComponent<E extends PrimitiveElement> = (
  props: PrimitiveProps<E>,
) => ReactElement | null;

/** The elements of the Soundor build, by name. */
export type PrimitiveComponents = { readonly [E in PrimitiveElement]: PrimitiveComponent<E> };

/**
 * What the services return to spread on the node element they serve (`Primitive.svg`,
 * `Primitive.div`, `Primitive.button`): handlers of Soundor's events, and the actions of
 * assistive technology. Only the props a service sets: no `undefined` reaches a Soundor prop.
 */
export interface ServiceProps {
  readonly onPointerDown?: (event: PointerEvent) => void;
  readonly onPointerMove?: (event: PointerEvent) => void;
  readonly onPointerUp?: (event: PointerEvent) => void;
  readonly onPointerCancel?: (event: PointerEvent) => void;
  readonly onPointerEnter?: (event: PointerEvent) => void;
  readonly onPointerLeave?: (event: PointerEvent) => void;
  readonly onContextMenu?: (event: PointerEvent) => void;
  readonly onWheel?: (event: WheelEvent) => void;
  readonly onFocus?: (event: FocusEvent) => void;
  readonly onBlur?: (event: FocusEvent) => void;
  readonly onFocusVisibleChange?: (event: FocusEvent) => void;
  readonly accessibilityActions?: readonly AccessibilityActionInfo[];
  readonly onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}

/**
 * What a service returns: the props to merge into the element it serves (`mergeProps`), and a
 * ref to compose with the element's (`useComposedRefs`). Soundor's services need no ref: it is
 * always `undefined` here, and a node of the web build.
 */
export interface ServiceResult {
  readonly props: ServiceProps;
  readonly ref: RefCallback<UiNode> | undefined;
}

/** What `useInteraction` returns: the service, and the store of the element's interaction state. */
export interface InteractionResult extends ServiceResult {
  /** Read its fields with `useInteractionField(store, field)`. */
  readonly store: InteractionStore;
}

/**
 * What `useStyleState` returns to spread on `Primitive.button`: the handlers through which
 * Soundor's `Pressable` reports the changes of its state.
 */
export interface StyleStateProps {
  readonly onHoverIn: (event: PointerEvent) => void;
  readonly onHoverOut: (event: PointerEvent) => void;
  readonly onPressIn: (event: PointerEvent) => void;
  readonly onPressOut: (event: PointerEvent) => void;
  readonly onFocus: (event: FocusEvent) => void;
  readonly onBlur: (event: FocusEvent) => void;
  readonly onFocusVisibleChange: (event: FocusEvent) => void;
}
