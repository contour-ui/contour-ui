import type { KeyLike } from './key-like.ts';

/**
 * Where a key moves the highlight of a list: to the first or the last item, or one step to the
 * next or the previous one. The list decides what that is: it skips disabled items, and a step
 * past an end stops there or wraps around to the other end (`loop` of a list collection).
 */
export type ListIntent = 'first' | 'last' | 'next' | 'previous';

/** How a list lays out its items, which sets the arrow keys that move through it. */
export interface ListNavigationOptions {
  /**
   * A vertical list moves with ↓ and ↑, a horizontal one with → and ←.
   *
   * @defaultValue 'vertical'
   */
  readonly orientation?: 'vertical' | 'horizontal' | undefined;
  /**
   * The direction of the text around the list. In a right-to-left horizontal list, ← moves to
   * the next item and → to the previous one.
   *
   * @defaultValue 'ltr'
   */
  readonly dir?: 'ltr' | 'rtl' | undefined;
}

/**
 * The intent of a key in a list: ↓ and ↑ (→ and ← in a horizontal list) step to the next and
 * the previous item, Home and End go to the first and the last one. Any other key has none
 * (`null`), and so has a key pressed with Ctrl, Alt or Meta: those combinations belong to the
 * platform, such as moving the caret by word or line in a text field. Shift does not change the
 * intent.
 *
 * @example
 * getListIntent({ key: 'ArrowDown', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false });
 * // 'next'
 */
export function getListIntent(
  event: KeyLike,
  { orientation = 'vertical', dir = 'ltr' }: ListNavigationOptions = {},
): ListIntent | null {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return null;
  }
  const vertical = orientation === 'vertical';
  // The arrow that points to the end of a horizontal list.
  const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  switch (event.key) {
    case 'Home': {
      return 'first';
    }
    case 'End': {
      return 'last';
    }
    case 'ArrowDown': {
      return vertical ? 'next' : null;
    }
    case 'ArrowUp': {
      return vertical ? 'previous' : null;
    }
    case 'ArrowLeft':
    case 'ArrowRight': {
      if (vertical) {
        return null;
      }
      return event.key === forward ? 'next' : 'previous';
    }
    default: {
      return null;
    }
  }
}
