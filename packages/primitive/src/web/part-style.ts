import type { CSSProperties } from 'react';

/**
 * The `style` a user gives a part of a component: on the web, CSS properties, as React DOM takes
 * them. Native platforms also take a function of the part's state (`State`, such as the
 * interaction state of a button): the web takes none, since its stylesheets read the state
 * themselves (`:hover`, data attributes), so the type is the same for every state.
 *
 * @example
 * interface ButtonProps extends Omit<PrimitiveProps<'button'>, 'style'> {
 *   readonly style?: PartStyle<InteractionState> | undefined;
 * }
 */
export type PartStyle<State> = [State] extends [unknown] ? CSSProperties : never;

/**
 * The styles of a user's `style` for the part in its state, to merge after the part's own: on the
 * web, `style` as it is. A plain function, so a server may run it.
 *
 * @example
 * <Primitive.button {...mergeProps(look.root, { ...props, style: resolveStyle(props.style, state) })} />
 */
export function resolveStyle(
  style: CSSProperties | undefined,
  _state: unknown,
): CSSProperties | undefined {
  return style;
}
