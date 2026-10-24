import { createElement, StrictMode, useLayoutEffect } from 'react';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { render, renderHook } from 'vitest-browser-react';

import { useControllableState } from './use-controllable-state.ts';
import type { UseControllableStateProps, ValueChangeDetails } from './use-controllable-state.ts';

type OnValueChange<T = number> = (details: ValueChangeDetails<T>) => void;
type Format = (value: number) => string;

const percent: Format = (value) => `${value * 100}%`;
const decibels: Format = (value) => `${value} dB`;

const sameItems = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);

interface OwnerProps {
  readonly value: number;
  readonly step: number;
  readonly onValueChange: OnValueChange;
}

interface IncrementerProps {
  readonly setValue: Dispatch<SetStateAction<number>>;
  readonly step: number;
}

/** Controls the state of its child, which adds `step` to it whenever `step` changes. */
function Owner({ value, step, onValueChange }: OwnerProps): ReactElement {
  const [, setValue] = useControllableState({ value, defaultValue: 0, onValueChange });
  return createElement(Incrementer, { setValue, step });
}

/** Calls the setter from a layout effect, which runs before the layout effects of its owner. */
function Incrementer({ setValue, step }: IncrementerProps): null {
  useLayoutEffect(() => {
    setValue((value) => value + step);
  }, [setValue, step]);
  return null;
}

/** Renders the hook, optionally in StrictMode, and counts the renders of its host component. */
async function renderState<T>(
  initialProps: UseControllableStateProps<T>,
  wrapper?: typeof StrictMode,
) {
  let renders = 0;
  const hook = await renderHook(
    (props?: UseControllableStateProps<T>) => {
      renders += 1;
      return useControllableState(props ?? initialProps);
    },
    { initialProps, ...(wrapper === undefined ? {} : { wrapper }) },
  );
  return { ...hook, renders: () => renders };
}

describe('useControllableState', () => {
  describe('uncontrolled', () => {
    it('starts at defaultValue and keeps its own state', async () => {
      const onValueChange = vi.fn<OnValueChange>();
      const { result, act } = await renderState({ defaultValue: 1, onValueChange });
      expect(result.current[0]).toBe(1);

      await act(() => {
        result.current[1](2);
      });

      expect(result.current[0]).toBe(2);
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 2 });
    });

    it('reads defaultValue on the first render only', async () => {
      const { result, rerender } = await renderState({ defaultValue: 1 });

      await rerender({ defaultValue: 5 });

      expect(result.current[0]).toBe(1);
    });

    it('applies updaters called in a row to the latest value', async () => {
      const onValueChange = vi.fn<OnValueChange>();
      const { result, act } = await renderState({ defaultValue: 1, onValueChange });

      await act(() => {
        const [, setValue] = result.current;
        setValue((value) => value + 1);
        setValue((value) => value * 10);
      });

      expect(result.current[0]).toBe(20);
      expect(onValueChange.mock.calls).toStrictEqual([[{ value: 2 }], [{ value: 20 }]]);
    });
  });

  describe('controlled', () => {
    it('returns value and leaves the change to the owner', async () => {
      const onValueChange = vi.fn<OnValueChange>();
      const { result, act, rerender } = await renderState({
        value: 1,
        defaultValue: 0,
        onValueChange,
      });

      await act(() => {
        result.current[1](2);
      });

      expect(result.current[0]).toBe(1);
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 2 });

      await rerender({ value: 2, defaultValue: 0, onValueChange });

      expect(result.current[0]).toBe(2);
      // A new `value` prop is not a change made through the setter.
      expect(onValueChange).toHaveBeenCalledOnce();
    });

    it('passes the value prop to updaters', async () => {
      const onValueChange = vi.fn<OnValueChange>();
      const { result, act } = await renderState({ value: 1, defaultValue: 0, onValueChange });

      await act(() => {
        const [, setValue] = result.current;
        setValue((value) => value + 1);
        setValue((value) => value + 1);
      });

      // The owner has not applied the first change, so both updaters start from `value`.
      expect(onValueChange.mock.calls).toStrictEqual([[{ value: 2 }], [{ value: 2 }]]);
      expect(result.current[0]).toBe(1);
    });
  });

  describe('equal values', () => {
    it('drops a value equal to the current one', async () => {
      const onValueChange = vi.fn<OnValueChange>();
      const uncontrolled = await renderState({ defaultValue: 1, onValueChange });
      const controlled = await renderState({ value: 1, defaultValue: 0, onValueChange });
      const renders = uncontrolled.renders();

      await uncontrolled.act(() => {
        const [, setValue] = uncontrolled.result.current;
        setValue(1);
        setValue((value) => value);
      });
      await controlled.act(() => {
        controlled.result.current[1](1);
      });

      expect(onValueChange).not.toHaveBeenCalled();
      expect(uncontrolled.renders()).toBe(renders);
    });

    it('compares values with isEqual', async () => {
      const onValueChange = vi.fn<OnValueChange<readonly string[]>>();
      const { result, act } = await renderState<readonly string[]>({
        defaultValue: ['a'],
        onValueChange,
        isEqual: sameItems,
      });
      const [initial] = result.current;

      await act(() => {
        result.current[1](['a']);
      });

      expect(result.current[0]).toBe(initial);
      expect(onValueChange).not.toHaveBeenCalled();

      await act(() => {
        result.current[1](['a', 'b']);
      });

      expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: ['a', 'b'] });
    });
  });

  describe('setter', () => {
    it('keeps its identity across renders', async () => {
      const { result, act, rerender } = await renderState({ defaultValue: 1 });
      const [, setValue] = result.current;

      await act(() => {
        setValue(2);
      });
      await rerender({ defaultValue: 1, onValueChange: vi.fn<OnValueChange>() });

      expect(result.current[1]).toBe(setValue);
    });

    it('calls the latest onValueChange', async () => {
      const first = vi.fn<OnValueChange>();
      const second = vi.fn<OnValueChange>();
      const { result, act, rerender } = await renderState({
        defaultValue: 1,
        onValueChange: first,
      });

      await rerender({ defaultValue: 1, onValueChange: second });
      await act(() => {
        result.current[1](2);
      });

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledExactlyOnceWith({ value: 2 });
    });

    it('sees the props of the current commit from a child layout effect', async () => {
      const first = vi.fn<OnValueChange>();
      const second = vi.fn<OnValueChange>();
      const screen = await render(
        createElement(Owner, { value: 1, step: 1, onValueChange: first }),
      );

      await screen.rerender(createElement(Owner, { value: 5, step: 10, onValueChange: second }));

      expect(first).toHaveBeenCalledExactlyOnceWith({ value: 2 });
      expect(second).toHaveBeenCalledExactlyOnceWith({ value: 15 });
    });

    it('stores a function value returned by an updater', async () => {
      const { result, act } = await renderState<Format>({ defaultValue: percent });

      expect(result.current[0]).toBe(percent);

      await act(() => {
        result.current[1](() => decibels);
      });

      expect(result.current[0]).toBe(decibels);
    });
  });

  describe('in StrictMode', () => {
    it('reports every change once and calls updaters once', async () => {
      const onValueChange = vi.fn<OnValueChange>();
      const increment = vi.fn<(value: number) => number>((value) => value + 1);
      const uncontrolled = await renderState({ defaultValue: 1, onValueChange }, StrictMode);
      const controlled = await renderState(
        { value: 5, defaultValue: 0, onValueChange },
        StrictMode,
      );

      // StrictMode is on: React renders twice on mount.
      expect(uncontrolled.renders()).toBe(2);

      await uncontrolled.act(() => {
        uncontrolled.result.current[1](increment);
      });
      await controlled.act(() => {
        controlled.result.current[1](increment);
      });

      expect(uncontrolled.result.current[0]).toBe(2);
      expect(increment).toHaveBeenCalledTimes(2);
      expect(onValueChange.mock.calls).toStrictEqual([[{ value: 2 }], [{ value: 6 }]]);
    });
  });

  describe('switching between controlled and uncontrolled', () => {
    it('follows the value prop and keeps its own state apart', async () => {
      const { result, act, rerender } = await renderState({ defaultValue: 0 });
      await act(() => {
        result.current[1](1);
      });

      await rerender({ value: 5, defaultValue: 0 });
      await act(() => {
        result.current[1](6);
      });

      expect(result.current[0]).toBe(5);

      await rerender({ defaultValue: 0 });

      // Its own state again, untouched while the value was controlled.
      expect(result.current[0]).toBe(1);
    });
  });
});
