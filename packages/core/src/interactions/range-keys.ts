import type { KeyLike } from './key-like.ts';

/**
 * Where a key moves the value of a range control (a knob, a slider): a step or a page up or
 * down, or to an end. The control decides how far a step and a page are.
 */
export type RangeIntent =
  | 'increment'
  | 'decrement'
  | 'increment-page'
  | 'decrement-page'
  | 'min'
  | 'max';

/**
 * The intent of a key in a range control, as the ARIA slider pattern has it: ↑ and → step up,
 * ↓ and ← step down, Page Up and Page Down take a page, Home and End go to the ends. Any other
 * key has none (`null`), and so has a key pressed with Ctrl, Alt or Meta: those combinations
 * belong to the platform. Shift does not change the intent.
 *
 * @example
 * getRangeIntent({ key: 'PageUp', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false });
 * // 'increment-page'
 */
export function getRangeIntent(event: KeyLike): RangeIntent | null {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return null;
  }
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowRight': {
      return 'increment';
    }
    case 'ArrowDown':
    case 'ArrowLeft': {
      return 'decrement';
    }
    case 'PageUp': {
      return 'increment-page';
    }
    case 'PageDown': {
      return 'decrement-page';
    }
    case 'Home': {
      return 'min';
    }
    case 'End': {
      return 'max';
    }
    default: {
      return null;
    }
  }
}
