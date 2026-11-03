import { useState } from 'react';

import { RESTING_INTERACTION } from '../shared/interaction.ts';
import type { InteractionState } from '../shared/interaction.ts';
import type { StyleStateOptions, StyleStateResult } from '../shared/services.ts';
import type { StyleStateProps } from './types.ts';

/** `previous` with `changes`, or `previous` itself when they change nothing, so React bails out. */
function merge(previous: InteractionState, changes: Partial<InteractionState>): InteractionState {
  const next = { ...previous, ...changes };
  return next.pressed === previous.pressed &&
    next.hovered === previous.hovered &&
    next.focused === previous.focused &&
    next.focusVisible === previous.focusVisible
    ? previous
    : next;
}

/**
 * The interaction state of `Primitive.button` as a value of the component that renders it, and
 * the props to spread on that button (through `mergeProps`), for a component without behavior
 * whose look follows its state, as the styled `Button`. Soundor's `Pressable` keeps its state to
 * itself and gives it only to its `style` and `children` functions; this follows it through the
 * handlers Pressable calls (`onHoverIn`, `onPressIn`, `onFocus`, `onFocusVisibleChange`…), so the
 * component styles its parts and calls its hooks with it.
 *
 * `focusVisible` is Soundor's own, as Pressable has it: the focus a key gave, or one a press gave
 * once a key is pressed, as `:focus-visible` on the web.
 *
 * As Pressable's own, the state is at rest while `disabled`, from the render that turns it on:
 * Pressable drops its state as it turns off, without calling `onHoverOut`, `onPressOut` or
 * `onBlur`, and starts at rest when it turns on again. `use-style-state.test.tsx` holds the copy
 * to Pressable's state in every case, so it fails if Soundor changes how Pressable reports.
 *
 * @example
 * const { state, props: stateProps } = useStyleState({ disabled });
 * <Primitive.button disabled={disabled} {...mergeProps(stateProps, look(state), props)} />
 */
export function useStyleState(options: StyleStateOptions = {}): StyleStateResult<StyleStateProps> {
  const disabled = options.disabled ?? false;
  const [own, setOwn] = useState(RESTING_INTERACTION);
  // Adjusted while rendering, as React advises for state that follows a prop, so the render that
  // turns the button off is already at rest.
  const [wasDisabled, setWasDisabled] = useState(disabled);
  let state = own;
  if (disabled !== wasDisabled) {
    setWasDisabled(disabled);
    if (disabled) {
      setOwn(RESTING_INTERACTION);
      state = RESTING_INTERACTION;
    }
  }
  const report = (changes: Partial<InteractionState>): void => {
    // Off, Pressable reports nothing, and the copy takes nothing either.
    if (!disabled) {
      setOwn((previous) => merge(previous, changes));
    }
  };
  const props: StyleStateProps = {
    onHoverIn: () => {
      report({ hovered: true });
    },
    onHoverOut: () => {
      report({ hovered: false });
    },
    onPressIn: () => {
      report({ pressed: true });
    },
    onPressOut: () => {
      report({ pressed: false });
    },
    onFocus: (event) => {
      report({ focused: true, focusVisible: event.focusVisible });
    },
    onBlur: () => {
      report({ focused: false, focusVisible: false });
    },
    onFocusVisibleChange: (event) => {
      report({ focusVisible: event.focusVisible });
    },
  };
  return { state, props };
}
