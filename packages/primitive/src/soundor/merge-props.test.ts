import { flattenStyle } from '@soundor/react';
import type { PressableState } from '@soundor/react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { RESTING_INTERACTION } from '../shared/interaction.ts';
import { mergeProps } from './merge-props.ts';

const HOVERED: PressableState = { ...RESTING_INTERACTION, hovered: true };

/** A style of the state, as a user gives `Primitive.button`: whole under the pointer. */
const userStyle = ({ hovered }: PressableState) => ({ opacity: Number(hovered) * 0.2 + 0.8 });

describe('mergeProps on Soundor', () => {
  it('lets the last source win for plain props', () => {
    expect(
      mergeProps({ accessibilityLabel: 'part', debugId: 'part' }, { debugId: 'user' }),
    ).toEqual({ accessibilityLabel: 'part', debugId: 'user' });
  });

  it('ignores undefined values, so none reaches a Soundor prop', () => {
    const merged = mergeProps({ debugId: 'part', focusable: true }, { debugId: undefined });
    expect(merged).toStrictEqual({ debugId: 'part', focusable: true });
    expect(Object.values(mergeProps({ debugId: undefined }))).toEqual([]);
  });

  it('lists the styles in source order, the last one winning per property', () => {
    const part = { color: '#ff0000', margin: 0 };
    const user = { color: '#0000ff', padding: 4 };
    const merged = mergeProps({ style: part }, { style: user });
    expect(merged.style).toEqual([part, user]);
    expect(flattenStyle(merged.style)).toEqual({ color: '#0000ff', margin: 0, padding: 4 });
    expect(part).toEqual({ color: '#ff0000', margin: 0 });
  });

  it('lists the text styles the same way', () => {
    const merged = mergeProps({ textStyle: { fontSize: 12 } }, { textStyle: { fontSize: 14 } });
    expect(flattenStyle(merged.textStyle)).toEqual({ fontSize: 14 });
  });

  it('makes one function of the state of styles that are functions of it', () => {
    const part = { opacity: 0.5, margin: 2 };
    const merged = mergeProps({ style: part }, { style: userStyle });
    // A merge of an object and a function is the function's type for TypeScript: callable.
    const style: (state: PressableState) => unknown = merged.style;
    expect(style).toBeTypeOf('function');
    expect(flattenStyle(style(RESTING_INTERACTION))).toEqual({ opacity: 0.8, margin: 2 });
    expect(flattenStyle(style(HOVERED))).toEqual({ opacity: 1, margin: 2 });
  });

  it('calls every handler with the same arguments, the last source first', () => {
    const calls: string[] = [];
    const merged = mergeProps(
      {
        onPointerDown: (value: number) => {
          calls.push(`part ${value}`);
        },
      },
      {
        onPointerDown: (value: number) => {
          calls.push(`user ${value}`);
        },
      },
    );
    merged.onPointerDown(1);
    expect(calls).toEqual(['user 1', 'part 1']);
  });

  it('keeps a handler given once as it is', () => {
    const onPress = vi.fn<() => void>();
    expect(mergeProps({ onPress }, { debugId: 'user' }).onPress).toBe(onPress);
  });

  it('lets the last ref win: refs are composed apart', () => {
    const part = vi.fn<() => void>();
    const user = vi.fn<() => void>();
    expect(mergeProps({ ref: part }, { ref: user }).ref).toBe(user);
  });
});
