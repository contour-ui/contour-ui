import type { FocusEvent, PointerEvent } from 'soundor:ui';
import { useInsertionEffect, useLayoutEffect, useState } from 'react';

import { createInteractionStore, RESTING_INTERACTION } from '../shared/interaction.ts';
import type { InteractionStore } from '../shared/interaction.ts';
import type { InteractionOptions } from '../shared/services.ts';
import type { InteractionResult, ServiceProps } from './types.ts';

/** The store of a disabled element: at rest, and never changing. */
const RESTING_STORE: InteractionStore = Object.freeze({
  getState: () => RESTING_INTERACTION,
  subscribe: () => () => undefined,
});

/** A press of the primary button on the element, until its release. */
interface Press {
  readonly pointerId: number;
  /** Whether the pointer is over the element. */
  over: boolean;
}

/** The interaction service of one element: what it tracks, and the props that feed it. */
interface InteractionController {
  /** What the hook returns while the element is enabled. */
  readonly result: InteractionResult;
  /** What it returns while the element is disabled: the same props, a store at rest. */
  readonly resting: InteractionResult;
  readonly setOptions: (options: InteractionOptions) => void;
  /** Write the state again, after `disabled` or `hoverable` may have changed. */
  readonly update: () => void;
}

function createInteraction(initial: InteractionOptions): InteractionController {
  let options = initial;
  const store = createInteractionStore();
  /** A mouse or a pen is over the element. */
  let over = false;
  let press: Press | null = null;
  let focused = false;
  let focusVisible = false;
  /** The focus last reported to `onFocusChange`. */
  let reported = { focused: false, focusVisible: false };

  /**
   * Write what the element tracks into its store, and report a change of the focus as the state
   * shows it: none while disabled, the real one again once enabled.
   */
  const sync = (): void => {
    store.set({
      hovered: over && options.hoverable !== false,
      pressed: press?.over === true,
      focused,
      focusVisible,
    });
    const shownFocused = focused && options.disabled !== true;
    const shownVisible = shownFocused && focusVisible;
    if (reported.focused !== shownFocused || reported.focusVisible !== shownVisible) {
      reported = { focused: shownFocused, focusVisible: shownVisible };
      options.onFocusChange?.(shownFocused, shownVisible);
    }
  };

  /** The pointer came over the element (`isOver`) or left it. */
  const move = (event: PointerEvent, isOver: boolean): void => {
    // A touch has no hover: it is over the element only while it presses it.
    if (event.pointerType !== 'touch') {
      over = isOver;
    }
    if (press?.pointerId === event.pointerId) {
      press.over = isOver;
    }
    sync();
  };

  const release = (event: PointerEvent): void => {
    if (press?.pointerId === event.pointerId) {
      press = null;
      sync();
    }
  };

  const props: ServiceProps = {
    onPointerEnter: (event) => {
      move(event, true);
    },
    onPointerLeave: (event) => {
      move(event, false);
    },
    onPointerDown: (event) => {
      if (options.disabled === true || event.button !== 0 || press !== null) {
        return;
      }
      // The press keeps the pointer: its release reaches the element wherever it happens.
      press = { pointerId: event.pointerId, over: true };
      sync();
    },
    onPointerUp: release,
    onPointerCancel: release,
    // Focus events of Soundor do not bubble: these are the element's own.
    onFocus: (event: FocusEvent) => {
      focused = true;
      focusVisible = event.focusVisible;
      sync();
    },
    onBlur: () => {
      focused = false;
      focusVisible = false;
      sync();
    },
    onFocusVisibleChange: (event: FocusEvent) => {
      // A key shows the focus a press gave; a blur is followed by one too, which changes nothing.
      if (focused) {
        focusVisible = event.focusVisible;
        sync();
      }
    },
  };

  return {
    result: { store, props, ref: undefined },
    resting: { store: RESTING_STORE, props, ref: undefined },
    setOptions: (next) => {
      options = next;
    },
    update: () => {
      // A press does not outlast the element turning disabled.
      if (options.disabled === true) {
        press = null;
      }
      sync();
    },
  };
}

/**
 * The interaction state of an element with behavior on Soundor (see `InteractionOptions` and
 * `InteractionState`), in a store of its own: parts read its fields with `useInteractionField`,
 * so that only who reads a field renders again when it changes.
 *
 * - `hovered`: a mouse or a pen is over the element (`pointerenter`, `pointerleave`); never a
 *   touch, and never while `hoverable` is `false`.
 * - `pressed`: the primary button went down on the element and the pointer is over it, until the
 *   release; Soundor keeps the pointer with the press, so it stays over the element until then.
 * - `focused` and `focusVisible`: the element's own focus, shown as Soundor shows it
 *   (`FocusEvent.focusVisible`, `onFocusVisibleChange`): a key gave it, or a key was pressed
 *   since a press did.
 *
 * While `disabled`, the store returned rests (`RESTING_INTERACTION`) from that render on and no
 * press begins; hover and focus are still followed, so that the element shows its real state as
 * soon as it turns enabled. `onFocusChange` hears every change of the focus as the state shows
 * it: the focus goes (`false, false`) at the commit that disables the element, and comes back at
 * the one that enables it, if the element kept it (an element that stops taking focus gives it
 * up, `Primitive`'s focus fixup).
 *
 * Spread `props` on the element through `mergeProps`.
 *
 * @example
 * const interaction = useInteraction({
 *   disabled,
 *   hoverable: !readOnly,
 *   onFocusChange: (focused, visible) => {
 *     if (focused) api.focusControl(visible); else api.blurControl();
 *   },
 * });
 * <Primitive.svg {...mergeProps(interaction.props, ownProps, props)} />
 */
export function useInteraction(options: InteractionOptions = {}): InteractionResult {
  const [controller] = useState(() => createInteraction(options));
  useInsertionEffect(() => {
    controller.setOptions(options);
  });
  // After every commit: the state follows `disabled` and `hoverable` (a press ends as the element
  // turns disabled). Writing the same state again changes nothing and notifies nobody.
  useLayoutEffect(() => {
    controller.update();
  });
  return options.disabled === true ? controller.resting : controller.result;
}
