import { RESTING_INTERACTION } from '../shared/interaction.ts';
import type { StyleStateOptions, StyleStateResult } from '../shared/services.ts';
import type { StyleStateProps } from './types.ts';

/** The state at rest and no props: the same frozen object on every call. */
const STYLE_STATE: StyleStateResult<StyleStateProps> = Object.freeze({
  state: RESTING_INTERACTION,
  props: Object.freeze({}),
});

/**
 * The interaction state to style an element without behavior by (a button, a card), and the
 * props that follow it (see `StyleStateResult`). On the web the state always rests and there are
 * no props: the look of a hover, a press or a focus comes from CSS (`:hover`, `:active`,
 * `:focus-visible`). It calls no hook, so a server component may use it and stays one; native
 * platforms follow the state through the props.
 *
 * @example
 * const { state, props: stateProps } = useStyleState({ disabled });
 * const look = useStyles(button, { variant, size }, state);
 * <Primitive.button disabled={disabled} {...mergeProps(stateProps, look.root, props)} />
 */
export function useStyleState(_options?: StyleStateOptions): StyleStateResult<StyleStateProps> {
  return STYLE_STATE;
}
