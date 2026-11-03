import type { StyleProp } from '@soundor/react';

/**
 * The `style` a user gives a part of a component: on Soundor, styles (a style object, or a list of
 * them, later ones winning), or a function of the part's state (`State`, such as the interaction
 * state of a button) that returns them, as Soundor's `Pressable` takes its `style`. The web build
 * names the same type, CSS properties there.
 *
 * @example
 * interface ButtonProps extends Omit<PrimitiveProps<'button'>, 'style'> {
 *   readonly style?: PartStyle<InteractionState> | undefined;
 * }
 */
export type PartStyle<State> = StyleProp | ((state: State) => StyleProp);

/**
 * The styles of a user's `style` for the part in its state, to merge after the part's own: the
 * function called with the state, or the styles as they are. A plain function.
 *
 * @example
 * <Primitive.button {...mergeProps(look.root, { ...props, style: resolveStyle(props.style, state) })} />
 */
export function resolveStyle<State>(style: PartStyle<State> | undefined, state: State): StyleProp {
  return typeof style === 'function' ? style(state) : style;
}
