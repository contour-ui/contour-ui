/*
 * The interaction state of an element: one type with one meaning on every platform (D30 § 7),
 * kept in a store of its own per element, so that only who reads a field renders again when it
 * changes. A server module: the store is plain JavaScript, and `useInteractionField` (a client
 * module) reads it in React.
 */

/** How the user is interacting with an element, the same on every platform. */
export interface InteractionState {
  /** A mouse or a pen is over the element (the meaning of CSS `:hover`); never a touch. */
  readonly hovered: boolean;
  /**
   * The element is pressed and the pointer is still over it: it leaves with the pointer and
   * comes back with it. A drag that goes on wherever the pointer goes is a field of a machine
   * (`dragging` of a knob), not this.
   */
  readonly pressed: boolean;
  /** The element has the focus. */
  readonly focused: boolean;
  /**
   * The element has the focus and shows it (the meaning of CSS `:focus-visible`): a key gave it
   * the focus, or a key was pressed since a press did.
   */
  readonly focusVisible: boolean;
}

/** The state of an element nobody interacts with, and of every element while disabled. */
export const RESTING_INTERACTION: InteractionState = Object.freeze({
  hovered: false,
  pressed: false,
  focused: false,
  focusVisible: false,
});

/** The interaction state of one element, to read and to follow. */
export interface InteractionStore {
  /** The state now: the same object until a field changes. */
  readonly getState: () => InteractionState;
  /** Call `onChange` after every change of the state; returns what stops it. */
  readonly subscribe: (onChange: () => void) => () => void;
}

/** A store a backend's `useInteraction` writes. */
export interface WritableInteractionStore extends InteractionStore {
  /** Change some fields; a change that changes nothing notifies nobody. */
  readonly set: (changes: Partial<InteractionState>) => void;
  /** Back to {@link RESTING_INTERACTION}, as when the element turns disabled. */
  readonly reset: () => void;
}

const sameState = (a: InteractionState, b: InteractionState): boolean =>
  a.hovered === b.hovered &&
  a.pressed === b.pressed &&
  a.focused === b.focused &&
  a.focusVisible === b.focusVisible;

/**
 * A store of the interaction state of one element, at rest. A backend's `useInteraction` creates
 * one per element and writes it from the element's events.
 *
 * @example
 * const store = createInteractionStore();
 * store.set({ hovered: true });
 * store.getState().hovered; // true
 */
export function createInteractionStore(): WritableInteractionStore {
  let state: InteractionState = RESTING_INTERACTION;
  const listeners = new Set<() => void>();
  const change = (next: InteractionState): void => {
    if (sameState(next, state)) {
      return;
    }
    state = next;
    for (const listener of listeners) {
      listener();
    }
  };
  return {
    getState: () => state,
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    set: (changes) => {
      change({ ...state, ...changes });
    },
    reset: () => {
      change(RESTING_INTERACTION);
    },
  };
}
