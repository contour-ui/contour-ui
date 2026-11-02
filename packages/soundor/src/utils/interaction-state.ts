import type { PressableProps, PressableState } from '@soundor/react';
import { useState } from 'react';

/** The handlers through which a `Pressable` reports the changes its state follows. */
type Reporting = Pick<
  Required<PressableProps>,
  | 'onHoverIn'
  | 'onHoverOut'
  | 'onPressIn'
  | 'onPressOut'
  | 'onFocus'
  | 'onBlur'
  | 'onFocusVisibleChange'
>;

const RESTING: PressableState = {
  pressed: false,
  hovered: false,
  focused: false,
  focusVisible: false,
};

/** `previous` with `changes`, or `previous` itself when they change nothing, so React bails out. */
function merge(previous: PressableState, changes: Partial<PressableState>): PressableState {
  const next = { ...previous, ...changes };
  return next.pressed === previous.pressed &&
    next.hovered === previous.hovered &&
    next.focused === previous.focused &&
    next.focusVisible === previous.focusVisible
    ? previous
    : next;
}

/**
 * The interaction state of a `Pressable` as a value of the component that renders it, and the
 * props to spread on that Pressable. Soundor's `Pressable` keeps its state to itself and gives it
 * only to its `style` and `children` functions; this follows it through the handlers Pressable
 * calls, so the component styles its parts, runs effects and calls hooks with it. The handlers
 * among `props` are still called.
 *
 * `focusVisible` is Soundor's own, as Pressable has it: the focus a key gave, or one a press gave
 * once a key is pressed (`FocusEvent.focusVisible` and `onFocusVisibleChange`), as
 * `:focus-visible` on the web.
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
): { readonly state: PressableState; readonly props: P } {
  const disabled = props.disabled ?? false;
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
  const report = (changes: Partial<PressableState>): void => {
    // Off, Pressable reports nothing, and the copy takes nothing either.
    if (!disabled) {
      setOwn((previous) => merge(previous, changes));
    }
  };
  const reporting: Reporting = {
    onHoverIn: (event) => {
      report({ hovered: true });
      props.onHoverIn?.(event);
    },
    onHoverOut: (event) => {
      report({ hovered: false });
      props.onHoverOut?.(event);
    },
    onPressIn: (event) => {
      report({ pressed: true });
      props.onPressIn?.(event);
    },
    onPressOut: (event) => {
      report({ pressed: false });
      props.onPressOut?.(event);
    },
    onFocus: (event) => {
      report({ focused: true, focusVisible: event.focusVisible });
      props.onFocus?.(event);
    },
    onBlur: (event) => {
      report({ focused: false, focusVisible: false });
      props.onBlur?.(event);
    },
    onFocusVisibleChange: (event) => {
      report({ focusVisible: event.focusVisible });
      props.onFocusVisibleChange?.(event);
    },
  };
  return { state, props: { ...props, ...reporting } };
}
