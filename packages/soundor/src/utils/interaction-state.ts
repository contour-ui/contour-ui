import type { PressableProps, PressableState } from '@soundor/react';
import { useState } from 'react';

import { useFocusVisible } from './focus-visible.ts';

/** The state of a `Pressable` as a value: Pressable's own, and whether its focus shows. */
export interface InteractionState extends PressableState {
  /** Focused from the keyboard, as `:focus-visible`: the control shows its focus ring. */
  readonly focusVisible: boolean;
}

/** The handlers through which a `Pressable` reports the changes its state follows. */
type Reporting = Pick<
  Required<PressableProps>,
  'onHoverIn' | 'onHoverOut' | 'onPressIn' | 'onPressOut' | 'onFocus' | 'onBlur'
>;

const RESTING: PressableState = { pressed: false, hovered: false, focused: false };

/**
 * The interaction state of a `Pressable` as a value of the component that renders it, and the
 * props to spread on that Pressable. Soundor's `Pressable` keeps its state to itself and gives it
 * only to its `style` and `children` functions; this follows it through the handlers Pressable
 * calls, so the component styles its parts, runs effects and calls hooks with it. The handlers
 * among `props` are still called.
 *
 * As Pressable's own, the state is at rest while `disabled`: Pressable drops its state as it turns
 * off, without calling `onHoverOut`, `onPressOut` or `onBlur`, and starts at rest when it turns
 * on again. `interaction-state.test.tsx` holds the copy to Pressable's state in every case, so it
 * fails if Soundor changes how Pressable reports.
 *
 * @example
 * const { state, props: pressable } = useInteractionState({ ...props, disabled });
 * return <Pressable {...pressable} style={rootStyle(state)}>…</Pressable>;
 */
export function useInteractionState<P extends PressableProps>(
  props: P,
): { readonly state: InteractionState; readonly props: P } {
  const disabled = props.disabled ?? false;
  const isFocusVisible = useFocusVisible();
  const [own, setOwn] = useState(RESTING);
  // Adjusted while rendering, as React advises for state that follows a prop, so the render that
  // turns the Pressable off is already at rest.
  const [wasDisabled, setWasDisabled] = useState(disabled);
  let state = own;
  if (disabled !== wasDisabled) {
    setWasDisabled(disabled);
    if (disabled) {
      setOwn(RESTING);
      state = RESTING;
    }
  }
  const report = (key: keyof PressableState, value: boolean): void => {
    // Off, Pressable reports nothing, and the copy takes nothing either.
    if (!disabled) {
      setOwn((previous) => (previous[key] === value ? previous : { ...previous, [key]: value }));
    }
  };
  const reporting: Reporting = {
    onHoverIn: (event) => {
      report('hovered', true);
      props.onHoverIn?.(event);
    },
    onHoverOut: (event) => {
      report('hovered', false);
      props.onHoverOut?.(event);
    },
    onPressIn: (event) => {
      report('pressed', true);
      props.onPressIn?.(event);
    },
    onPressOut: (event) => {
      report('pressed', false);
      props.onPressOut?.(event);
    },
    onFocus: (event) => {
      report('focused', true);
      props.onFocus?.(event);
    },
    onBlur: (event) => {
      report('focused', false);
      props.onBlur?.(event);
    },
  };
  return {
    state: { ...state, focusVisible: isFocusVisible(state.focused) },
    props: { ...props, ...reporting },
  };
}
