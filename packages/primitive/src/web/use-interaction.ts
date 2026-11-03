'use client';

import { useEffect, useInsertionEffect, useLayoutEffect, useState } from 'react';
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react';

import { createInteractionStore, RESTING_INTERACTION } from '../shared/interaction.ts';
import type { InteractionStore } from '../shared/interaction.ts';
import type { InteractionOptions } from '../shared/services.ts';
import { isPressFocusing, showsFocusRing } from './focus.ts';
import type { InteractionResult, ServiceProps } from './types.ts';

/** The store of a disabled element: at rest, and never changing. */
const RESTING_STORE: InteractionStore = Object.freeze({
  getState: () => RESTING_INTERACTION,
  subscribe: () => () => undefined,
});

/**
 * Keys that act only with another one. Pressed alone they show no focus, though Chromium's
 * `:focus-visible` follows them: Shift goes down for a fine drag of a control a click just
 * focused, which shows no ring.
 */
const MODIFIER_KEYS: ReadonlySet<string> = new Set([
  'Alt',
  'AltGraph',
  'CapsLock',
  'Control',
  'Fn',
  'Meta',
  'Shift',
]);

/**
 * Whether a key shows the focus a press gave: any key but a modifier alone or a shortcut of the
 * page or the system (with Control, Alt or Meta), as the `:focus-visible` polyfill of the WICG
 * has it.
 */
const showsFocus = (event: KeyboardEvent): boolean =>
  !MODIFIER_KEYS.has(event.key) && !event.ctrlKey && !event.altKey && !event.metaKey;

/** A press of the primary button on the element, until its release anywhere. */
interface Press {
  readonly pointerId: number;
  /** Whether the pointer is over the element. */
  over: boolean;
  /** Stops listening for the release. */
  readonly stop: () => void;
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
  /** The element unmounted: no release is awaited anymore. */
  readonly unmount: () => void;
}

function createInteraction(initial: InteractionOptions): InteractionController {
  let options = initial;
  const store = createInteractionStore();
  /** A mouse or a pen is over the element. */
  let over = false;
  let press: Press | null = null;
  /** The element while it has the focus, from its `focus` to its `blur`. */
  let focusedElement: Element | null = null;
  let focused = false;
  let focusVisible = false;
  /** The focus last reported to `onFocusChange`. */
  let reported = { focused: false, focusVisible: false };

  /**
   * Write what the element tracks into its store, and report a change of the focus as the state
   * shows it: none while disabled, so the owner hears the focus go as the element turns disabled.
   *
   * The focus fixup of the DOM takes the focus of an element that turned unfocusable (a disabled
   * control drops its `tabindex`) with no `blur` event; Chromium does it at its next style update.
   * So the focus counts while the element still matches `:focus`, and an element that turns
   * enabled again reports the focus only if it kept it.
   */
  const sync = (): void => {
    if (focusedElement !== null && !focusedElement.matches(':focus')) {
      focusedElement = null;
      focused = false;
      focusVisible = false;
    }
    store.set({
      hovered: over && options.hoverable !== false,
      pressed: press?.over === true,
      focused,
      focusVisible,
    });
    const enabled = options.disabled !== true;
    const shown = { focused: focused && enabled, focusVisible: focusVisible && enabled };
    if (reported.focused !== shown.focused || reported.focusVisible !== shown.focusVisible) {
      reported = shown;
      options.onFocusChange?.(shown.focused, shown.focusVisible);
    }
  };

  const endPress = (): void => {
    press?.stop();
    press = null;
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (options.disabled === true || event.button !== 0 || press !== null) {
      return;
    }
    const doc = event.currentTarget.ownerDocument;
    const { pointerId } = event;
    // The release may come anywhere: outside the element, or to a node that stops it.
    const onRelease = (release: Event): void => {
      if ('pointerId' in release && release.pointerId !== pointerId) {
        return;
      }
      endPress();
      sync();
    };
    doc.addEventListener('pointerup', onRelease, true);
    doc.addEventListener('pointercancel', onRelease, true);
    press = {
      pointerId,
      over: true,
      stop: () => {
        doc.removeEventListener('pointerup', onRelease, true);
        doc.removeEventListener('pointercancel', onRelease, true);
      },
    };
    sync();
  };

  /** The pointer came over the element (`over`) or left it. */
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

  const onFocus = (event: FocusEvent): void => {
    // The element's own focus, not that of an element inside it.
    if (event.target !== event.currentTarget) {
      return;
    }
    const element = event.currentTarget;
    focusedElement = element;
    focused = true;
    focusVisible = !isPressFocusing(element) && showsFocusRing(element);
    sync();
  };

  const onBlur = (event: FocusEvent): void => {
    if (event.target !== event.currentTarget) {
      return;
    }
    focusedElement = null;
    focused = false;
    focusVisible = false;
    sync();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    // A key shows the focus a press gave, as `:focus-visible` follows the keyboard.
    if (
      !focused ||
      focusVisible ||
      event.target !== event.currentTarget ||
      !showsFocus(event) ||
      !showsFocusRing(event.currentTarget)
    ) {
      return;
    }
    focusVisible = true;
    sync();
  };

  const props: ServiceProps = {
    onPointerEnter: (event) => {
      move(event, true);
    },
    onPointerLeave: (event) => {
      move(event, false);
    },
    onPointerDown,
    onFocus,
    onBlur,
    onKeyDown,
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
        endPress();
      }
      sync();
    },
    unmount: endPress,
  };
}

/**
 * The interaction state of an element with behavior on the DOM (see `InteractionOptions` and
 * `InteractionState`), in a store of its own: parts read its fields with `useInteractionField`,
 * so that only who reads a field renders again when it changes.
 *
 * - `hovered`: a mouse or a pen is over the element (`pointerenter`, `pointerleave`); never a
 *   touch, and never while `hoverable` is `false`.
 * - `pressed`: the primary button went down on the element and the pointer is over it; it leaves
 *   with the pointer, comes back with it, and ends at the release, wherever it happens.
 * - `focused` and `focusVisible`: the element's own focus, shown as `:focus-visible` shows it,
 *   but never for the focus a touch or a pen press gives from code (`useDrag`); a key pressed
 *   while it is focused shows it from then on, but a modifier alone or a shortcut (with Control,
 *   Alt or Meta).
 *
 * While `disabled`, the store returned rests (`RESTING_INTERACTION`) from that render on and no
 * press begins; hover and focus are still followed, so that the element shows its real state as
 * soon as it turns enabled. `onFocusChange` hears the focus as the state shows it: the focus goes
 * as the element turns disabled while focused, and comes back as it turns enabled only if the
 * element kept it (the DOM takes the focus of an element that lost its `tabindex`, with no
 * `blur`).
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
  useEffect(
    () => () => {
      controller.unmount();
    },
    [controller],
  );
  return options.disabled === true ? controller.resting : controller.result;
}
