import { describe, expect, it } from 'vite-plus/test';

import { isDoublePress } from './double-press.ts';
import type { KeyLike } from './key-like.ts';
import { getRangeIntent } from './range-keys.ts';
import { getRangeWheelDelta, getWheelDelta } from './wheel.ts';

const key = (value: string, modifiers: Partial<KeyLike> = {}): KeyLike => ({
  key: value,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...modifiers,
});

describe('getRangeIntent', () => {
  it('steps with the arrows, pages with Page Up and Down, and goes to the ends with Home and End', () => {
    expect(getRangeIntent(key('ArrowUp'))).toBe('increment');
    expect(getRangeIntent(key('ArrowRight'))).toBe('increment');
    expect(getRangeIntent(key('ArrowDown'))).toBe('decrement');
    expect(getRangeIntent(key('ArrowLeft'))).toBe('decrement');
    expect(getRangeIntent(key('PageUp'))).toBe('increment-page');
    expect(getRangeIntent(key('PageDown'))).toBe('decrement-page');
    expect(getRangeIntent(key('Home'))).toBe('min');
    expect(getRangeIntent(key('End'))).toBe('max');
  });

  it('keeps the intent with Shift and leaves other keys and shortcuts alone', () => {
    expect(getRangeIntent(key('ArrowUp', { shiftKey: true }))).toBe('increment');
    expect(getRangeIntent(key('a'))).toBeNull();
    expect(getRangeIntent(key('Enter'))).toBeNull();
    expect(getRangeIntent(key('ArrowUp', { ctrlKey: true }))).toBeNull();
    expect(getRangeIntent(key('Home', { metaKey: true }))).toBeNull();
    expect(getRangeIntent(key('ArrowDown', { altKey: true }))).toBeNull();
  });
});

describe('getWheelDelta', () => {
  it('turns lines and pages into pixels', () => {
    expect(getWheelDelta({ deltaX: 0, deltaY: 100, deltaMode: 0 })).toStrictEqual({ x: 0, y: 100 });
    expect(getWheelDelta({ deltaX: 1, deltaY: 3, deltaMode: 1 })).toStrictEqual({ x: 16, y: 48 });
    expect(getWheelDelta({ deltaX: 0, deltaY: -1, deltaMode: 2 })).toStrictEqual({ x: 0, y: -800 });
  });
});

describe('getRangeWheelDelta', () => {
  it('takes the vertical distance, or the sideways one that macOS sends under Shift', () => {
    expect(getRangeWheelDelta({ deltaX: 0, deltaY: 100, deltaMode: 0, shiftKey: false })).toBe(100);
    expect(getRangeWheelDelta({ deltaX: 40, deltaY: 0, deltaMode: 0, shiftKey: true })).toBe(40);
    expect(getRangeWheelDelta({ deltaX: 3, deltaY: 0, deltaMode: 1, shiftKey: true })).toBe(48);
    // Without Shift, sideways scrolling does not turn the control.
    expect(getRangeWheelDelta({ deltaX: 40, deltaY: 0, deltaMode: 0, shiftKey: false })).toBe(0);
    expect(getRangeWheelDelta({ deltaX: 40, deltaY: -10, deltaMode: 0, shiftKey: true })).toBe(-10);
  });
});

describe('isDoublePress', () => {
  it('takes two presses close in time and place', () => {
    expect(isDoublePress({ time: 0, x: 10, y: 10 }, { time: 300, x: 12, y: 9 })).toBe(true);
    expect(isDoublePress({ time: 0, x: 10, y: 10 }, { time: 500, x: 10, y: 10 })).toBe(true);
  });

  it('refuses a first press, a slow one, a far one and one from before', () => {
    expect(isDoublePress(null, { time: 0, x: 0, y: 0 })).toBe(false);
    expect(isDoublePress({ time: 0, x: 10, y: 10 }, { time: 501, x: 10, y: 10 })).toBe(false);
    expect(isDoublePress({ time: 0, x: 10, y: 10 }, { time: 100, x: 15, y: 10 })).toBe(false);
    expect(isDoublePress({ time: 100, x: 10, y: 10 }, { time: 50, x: 10, y: 10 })).toBe(false);
  });

  it('takes another interval and slop', () => {
    const options = { interval: 250, slop: 8 };
    expect(isDoublePress({ time: 0, x: 0, y: 0 }, { time: 300, x: 0, y: 0 }, options)).toBe(false);
    expect(isDoublePress({ time: 0, x: 0, y: 0 }, { time: 200, x: 7, y: -7 }, options)).toBe(true);
  });
});
