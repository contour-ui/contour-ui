import { useCallback, useInsertionEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * What `onValueChange` receives. An object rather than a bare value, so that fields can be
 * added later without breaking callbacks.
 */
export interface ValueChangeDetails<T> {
  /** The new value. */
  readonly value: T;
}

/** Props of {@link useControllableState}. */
export interface UseControllableStateProps<T> {
  /**
   * The controlled value. While it is defined, the owner controls the state: the hook returns
   * it and the setter only reports the next value through `onValueChange`. `undefined` means
   * uncontrolled, so a controlled state that can be empty needs another empty value, such as
   * `null`.
   */
  readonly value?: T | undefined;
  /** The initial value of the uncontrolled state. Like the argument of `useState`, read once. */
  readonly defaultValue: T;
  /**
   * Called when the setter changes the value, controlled or not. Not called on mount, when the
   * `value` prop changes, or when the setter gets a value equal to the current one.
   */
  readonly onValueChange?: ((details: ValueChangeDetails<T>) => void) | undefined;
  /**
   * Whether two values are the same: the setter drops a value equal to the current one.
   * Defaults to `Object.is`, the rule React applies to state. Pass a structural comparison
   * for values that are rebuilt on every change, such as arrays.
   */
  readonly isEqual?: ((a: T, b: T) => boolean) | undefined;
}

/** The current value and its setter, like the pair `useState` returns. */
export type UseControllableStateReturn<T> = [value: T, setValue: Dispatch<SetStateAction<T>>];

/**
 * State that the owner of a component may control: the `value` / `defaultValue` /
 * `onValueChange` pattern of stateful components.
 *
 * - **Controlled** (`value` is defined): returns `value`. The setter reports the next value
 *   through `onValueChange`; the state changes once the owner passes it back as `value`.
 * - **Uncontrolled** (`value` is `undefined`): keeps its own state, starting at
 *   `defaultValue`, and reports every change through `onValueChange` too.
 *
 * The setter keeps its identity for the lifetime of the component and, like the `useState`
 * one, takes a value or an updater function (so a function value is set as
 * `setValue(() => fn)`). An updater receives the latest value: when uncontrolled, it includes
 * the changes made earlier in the same event; when controlled, it is the `value` of the last
 * render, since only the owner applies changes. The setter calls `onValueChange` right away,
 * so call it from event handlers and effects, never during render.
 *
 * A component must stay either controlled or uncontrolled for its lifetime. The hook does not
 * warn about a switch (core has no console in its types and no development flag); it follows
 * the current `value` instead. Once `value` turns `undefined`, the hook returns its own state
 * again, which does not track the controlled value: `defaultValue`, or the last value it held
 * while uncontrolled.
 *
 * @example
 * ```ts
 * const [open, setOpen] = useControllableState({
 *   value: props.open,
 *   defaultValue: props.defaultOpen ?? false,
 *   onValueChange: ({ value }) => props.onOpenChange?.({ open: value }),
 * });
 * ```
 */
export function useControllableState<T>(
  props: UseControllableStateProps<T>,
): UseControllableStateReturn<T> {
  const { value, defaultValue } = props;
  const controlled = value !== undefined;
  // Initializer form: a function `defaultValue` is a value, not an initializer.
  const [ownValue, setOwnValue] = useState(() => defaultValue);

  // The setter reads the props of the last commit through a ref, which keeps it stable.
  // Insertion effects run before all layout effects of a commit, so a child that calls the
  // setter from its own layout effect already sees the new props.
  const propsRef = useRef(props);
  useInsertionEffect(() => {
    propsRef.current = props;
  });

  // The uncontrolled value including updates React has not rendered yet, so that updaters
  // called in a row build on each other. Only the setter changes the uncontrolled state.
  const ownValueRef = useRef(ownValue);

  const setValue = useCallback((action: SetStateAction<T>): void => {
    const { value: controlledValue, onValueChange, isEqual = Object.is } = propsRef.current;
    const isControlled = controlledValue !== undefined;
    const previous = isControlled ? controlledValue : ownValueRef.current;
    const next = isUpdater(action) ? action(previous) : action;
    if (isEqual(previous, next)) {
      return;
    }
    if (!isControlled) {
      ownValueRef.current = next;
      // Wrapped, or React would call a function value as an updater.
      setOwnValue(() => next);
    }
    onValueChange?.({ value: next });
  }, []);

  return [controlled ? value : ownValue, setValue];
}

function isUpdater<T>(action: SetStateAction<T>): action is (previous: T) => T {
  return typeof action === 'function';
}
